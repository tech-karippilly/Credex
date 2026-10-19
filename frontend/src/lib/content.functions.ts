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
  location: "Irinjalakuda, Thrissur, Kerala, India",
  linkedin: "",
  instagram: "",
  hero_title: "The next-generation lending OS for modern NBFCs.",
  hero_text:
    "CREDEX unifies loan origination, KYC, branch & field collections, and the general ledger on one real-time core — purpose-built for India's NBFCs and MFIs.",
  hero_image: "",
  about_image: "",
};

class SiteContentApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteContentApiError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Accept: "application/json" },
  });
  let body: ApiSuccessResponse<T> | { success?: false; message?: string };
  try {
    body = (await res.json()) as ApiSuccessResponse<T> | { success?: false; message?: string };
  } catch {
    throw new SiteContentApiError("Failed to load site content");
  }
  if (!res.ok || !("success" in body) || !body.success) {
    throw new SiteContentApiError(
      "message" in body && body.message ? body.message : "Failed to load site content",
    );
  }
  return body.data;
}

function isApiUnavailable(error: unknown): boolean {
  if (error instanceof SiteContentApiError) return true;
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
    if (isApiUnavailable(error)) {
      console.warn(
        `[getSiteContent] Backend API unavailable at ${getApiBaseUrl()}; using defaults. Start this repo's backend (npm run start:dev in /backend).`,
      );
      return EMPTY_SITE_CONTENT;
    }
    throw error;
  }
});
