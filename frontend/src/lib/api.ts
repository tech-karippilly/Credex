import type { ApiErrorResponse, ApiSuccessResponse } from "./api-types";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from "./auth-storage";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Nest API on this machine. Backend `PORT` is 1000. */
const LOCAL_API_BASE_URL = "http://127.0.0.1:1000/api/v1";

function configuredApiBaseUrl(): string | undefined {
  const fromVite = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (typeof fromVite === "string" && fromVite.trim()) return fromVite.trim().replace(/\/$/, "");
  if (typeof process !== "undefined" && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, "");
  }
  return undefined;
}

function isQuickTunnel(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".trycloudflare.com");
  } catch {
    return false;
  }
}

/**
 * Browser calls from https://credexfin.com use the local API when the baked
 * base URL is a Cloudflare quick tunnel. Those hostnames expire, and the live
 * one is a different backend than the API on port 1000.
 */
export function resolveApiBaseUrl(configured: string | undefined, pageHostname?: string): string {
  if (configured && pageHostname && isQuickTunnel(configured)) {
    return LOCAL_API_BASE_URL;
  }
  return configured ?? "http://localhost:3000/api/v1";
}

export function getApiBaseUrl(): string {
  const pageHostname =
    typeof window !== "undefined" && import.meta.env.DEV ? window.location.hostname : undefined;
  return resolveApiBaseUrl(configuredApiBaseUrl(), pageHostname);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    return false;
  }

  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearAuthSession();
    return false;
  }

  const body = (await res.json()) as ApiSuccessResponse<{
    accessToken: string;
    refreshToken: string;
  }>;

  updateTokens({
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
  });
  return true;
}

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function unwrapApiResponse<T>(body: ApiSuccessResponse<T> | ApiErrorResponse): T {
  if (!body.success) {
    throw new ApiError(400, body.message || "Request failed");
  }
  return body.data;
}

type RequestOptions = {
  method?: string;
  auth?: boolean;
  json?: unknown;
  formData?: FormData;
  headers?: HeadersInit;
  skipRefresh?: boolean;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", auth = false, json, formData, headers, skipRefresh = false } = options;

  const run = async (retry: boolean): Promise<T> => {
    const reqHeaders = new Headers(headers);
    reqHeaders.set("Accept", "application/json");

    if (json !== undefined) {
      reqHeaders.set("Content-Type", "application/json");
    }

    if (auth) {
      const token = getAccessToken();
      if (token) reqHeaders.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(`${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: reqHeaders,
      body: formData ?? (json !== undefined ? JSON.stringify(json) : undefined),
    });

    if (res.status === 401 && auth && !skipRefresh && retry) {
      const refreshed = await ensureRefreshed();
      if (refreshed) return run(false);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin";
      }
      throw new ApiError(401, "Session expired. Please sign in again.");
    }

    const text = await res.text();
    let parsed: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiSuccessResponse<T> | ApiErrorResponse;
      } catch {
        throw new ApiError(res.status, res.statusText || "Invalid server response");
      }
    }

    if (!res.ok) {
      const message =
        parsed && "message" in parsed && parsed.message
          ? parsed.message
          : res.statusText || "Request failed";
      throw new ApiError(res.status, message);
    }

    if (!parsed || !("success" in parsed) || !parsed.success) {
      throw new ApiError(res.status, "Unexpected server response");
    }

    return parsed.data as T;
  };

  return run(true);
}

export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const run = async (retry: boolean): Promise<{ blob: Blob; filename: string }> => {
    const reqHeaders = new Headers();
    reqHeaders.set("Accept", "application/octet-stream, application/json");
    const token = getAccessToken();
    if (token) reqHeaders.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
      method: "GET",
      headers: reqHeaders,
    });

    if (res.status === 401 && retry) {
      const refreshed = await ensureRefreshed();
      if (refreshed) return run(false);
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin";
      }
      throw new ApiError(401, "Session expired. Please sign in again.");
    }

    if (!res.ok) {
      const text = await res.text();
      let message = res.statusText || "Request failed";
      if (text) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          if (parsed.message) message = parsed.message;
        } catch {
          message = text;
        }
      }
      throw new ApiError(res.status, message);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="([^"]+)"/.exec(disposition);
    return { blob, filename: match?.[1] ?? "report.xlsx" };
  };

  return run(true);
}

export function apiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
