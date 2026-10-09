import { createServerFn } from "@tanstack/react-start";
import { careerToJobRow, serviceToRow, siteContactToSettings } from "./cms-mappers";
import { getApiBaseUrl } from "./api";
import type { ApiSuccessResponse } from "./api-types";
import type { Career, Service, SiteContact } from "./api-types";

export type SiteSettings = {
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  instagram: string;
  hero_title: string;
  hero_text: string;
  hero_image: string;
  about_image: string;
};

export type ServiceRow = {
  id: string;
  title: string;
  short: string;
  description: string;
  icon: string;
  image_url: string | null;
  capabilities: string[];
  benefits: string[];
  sort: number;
  published: boolean;
};

export type JobRow = {
  id: string;
  title: string;
  location: string;
  employment: string;
  experience: string;
  workplace: string;
  salary: string;
  responsibilities: string[];
  requirements: string[];
  good_to_have: string;
  sort: number;
  published: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  email: "hr@credexfin.com",
  phone: "+91 80785 99537",
  location: "Irinjalakuda, Kerala, India",
  linkedin: "",
  instagram: "",
  hero_title: "Technology That Solves Real Business Problems.",
  hero_text:
    "Credex builds practical, scalable technology solutions that help businesses simplify operations, automate processes, improve efficiency, and create real business value.",
  hero_image: "",
  about_image: "",
};

class ApiUnreachableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiUnreachableError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new ApiUnreachableError(`Backend API unreachable at ${url}`, { cause: error });
  }

  const text = await res.text();
  if (!text.trim()) {
    throw new ApiUnreachableError(`Empty response from ${url} (HTTP ${res.status})`);
  }

  let body: ApiSuccessResponse<T> | { success: false; message: string };
  try {
    body = JSON.parse(text) as ApiSuccessResponse<T> | { success: false; message: string };
  } catch (error) {
    throw new ApiUnreachableError(`Non-JSON response from ${url} (HTTP ${res.status})`, {
      cause: error,
    });
  }

  if (!res.ok || !body.success) {
    throw new Error("message" in body && body.message ? body.message : "Failed to load site content");
  }
  return body.data;
}

function isApiUnreachable(error: unknown): boolean {
  if (error instanceof ApiUnreachableError) return true;
  if (!(error instanceof Error)) return false;
  if (error.message === "fetch failed") return true;
  const cause = error.cause;
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = (cause as { code?: string }).code;
    return code === "ECONNREFUSED" || code === "ENOTFOUND";
  }
  return false;
}

const EMPTY_SITE_CONTENT = {
  settings: DEFAULT_SETTINGS,
  services: [] as ServiceRow[],
  jobs: [] as JobRow[],
};

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [siteContact, services, careers] = await Promise.all([
      fetchJson<SiteContact>("/site-contact"),
      fetchJson<Service[]>("/services"),
      fetchJson<Career[]>("/careers"),
    ]);

    const settings = siteContactToSettings(siteContact);
    return {
      settings: {
        email: settings.email || DEFAULT_SETTINGS.email,
        phone: settings.phone || DEFAULT_SETTINGS.phone,
        location: settings.location || DEFAULT_SETTINGS.location,
        linkedin: settings.linkedin,
        instagram: settings.instagram,
        hero_title: settings.hero_title || DEFAULT_SETTINGS.hero_title,
        hero_text: settings.hero_text || DEFAULT_SETTINGS.hero_text,
        hero_image: settings.hero_image,
        about_image: settings.about_image,
      },
      services: services.map(serviceToRow),
      jobs: careers.map(careerToJobRow),
    };
  } catch (error) {
    if (isApiUnreachable(error)) {
      const reason = error instanceof Error ? error.message : "unknown error";
      console.warn(
        `[getSiteContent] ${reason}. Using defaults. Start the backend (npm run start:dev in /backend).`,
      );
      return EMPTY_SITE_CONTENT;
    }
    throw error;
  }
});
