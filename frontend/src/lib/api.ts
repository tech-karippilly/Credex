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

/** Local Nest API. Used only when developing on this machine. */
const LOCAL_API_BASE_URL = "http://127.0.0.1:1000/api/v1";

export class ApiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiConfigError";
  }
}

function configuredApiBaseUrl(): string | undefined {
  const fromVite = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  if (typeof fromVite === "string" && fromVite.trim()) return fromVite.trim().replace(/\/$/, "");
  const fromProcess = typeof process !== "undefined" ? process.env["API_BASE_URL"] : undefined;
  if (typeof fromProcess === "string" && fromProcess.trim()) return fromProcess.trim().replace(/\/$/, "");
  return undefined;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function isLoopbackApi(url: string): boolean {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export interface ApiBaseUrlContext {
  /** True for the Vite dev server and its browser bundle. */
  dev: boolean;
  /** Set in the browser. Absent during server-side rendering. */
  pageHostname?: string;
}

/**
 * Browser and server-side rendering share one configured API URL.
 * A loopback URL is allowed only for local development. A public page must
 * never be sent to the visitor's own computer.
 */
export function resolveApiBaseUrl(configured: string | undefined, context: ApiBaseUrlContext): string {
  const pageHostname = context.pageHostname;
  const onPublicPage = Boolean(pageHostname && !isLoopbackHost(pageHostname));

  if (!configured) {
    if (context.dev && !onPublicPage) return LOCAL_API_BASE_URL;
    throw new ApiConfigError("Set VITE_API_BASE_URL to the public Credex API.");
  }

  if (isLoopbackApi(configured)) {
    if (!context.dev || onPublicPage) {
      throw new ApiConfigError(
        "The API URL is a local address. Set VITE_API_BASE_URL to the public Credex API.",
      );
    }
  }

  return configured;
}

export function getApiBaseUrl(): string {
  const context: ApiBaseUrlContext = { dev: import.meta.env.DEV };
  if (typeof window !== "undefined") context.pageHostname = window.location.hostname;
  return resolveApiBaseUrl(configuredApiBaseUrl(), context);
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
