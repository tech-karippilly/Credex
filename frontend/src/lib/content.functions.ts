import { careerToJobRow, serviceToRow, siteContactToSettings, teamMemberToRow } from "./cms-mappers";
import { getApiBaseUrl } from "./api";
import type { ApiSuccessResponse } from "./api-types";
import type { Career, Service, SiteContact, TeamMember } from "./api-types";

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

export type TeamMemberRow = {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  positionInCompany: string;
  bio: string;
  photoUrl: string;
  sort: number;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  email: "support@neuraforgeai.org",
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

class ApiUnreachableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiUnreachableError";
  }
}

class ContentRequestError extends Error {
  readonly path: string;
  readonly status: number;

  constructor(path: string, status: number, message: string) {
    super(message);
    this.name = "ContentRequestError";
    this.path = path;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorText(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const message = body["message"];
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const text = message
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .join(", ");
    if (text) return text;
  }
  const error = body["error"];
  if (typeof error === "string" && error.trim()) return error.trim();
  return null;
}

function isSuccessEnvelope(body: unknown): body is ApiSuccessResponse<unknown> {
  return isRecord(body) && body["success"] === true;
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

  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch (error) {
    throw new ApiUnreachableError(`Non-JSON response from ${url} (HTTP ${res.status})`, {
      cause: error,
    });
  }

  if (!res.ok || !isSuccessEnvelope(body)) {
    const detail = errorText(body) ?? res.statusText ?? "unexpected response";
    throw new ContentRequestError(
      path,
      res.status,
      `Failed to load ${path} (HTTP ${res.status}): ${detail}`,
    );
  }

  if (body.data === undefined) {
    throw new ContentRequestError(
      path,
      res.status,
      `Failed to load ${path} (HTTP ${res.status}): response did not include data`,
    );
  }

  return body.data as T;
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
  team: [] as TeamMemberRow[],
};

const CONTENT_REQUESTS = [
  { path: "/site-contact", label: "site contact" },
  { path: "/services", label: "services" },
  { path: "/careers", label: "careers" },
  { path: "/team-members", label: "team members" },
] as const;

async function loadSiteContent() {
  const settled = await Promise.allSettled([
    fetchJson<SiteContact>(CONTENT_REQUESTS[0].path),
    fetchJson<Service[]>(CONTENT_REQUESTS[1].path),
    fetchJson<Career[]>(CONTENT_REQUESTS[2].path),
    fetchJson<TeamMember[]>(CONTENT_REQUESTS[3].path),
  ]);

  const failures = CONTENT_REQUESTS.flatMap((request, index) => {
    const result = settled[index];
    if (!result || result.status === "fulfilled") return [];
    return [{ ...request, error: result.reason as unknown }];
  });

  if (failures.length > 0) {
    const fatal = failures.filter((failure) => !isApiUnreachable(failure.error));
    if (fatal.length > 0) {
      for (const failure of fatal) {
        const detail =
          failure.error instanceof Error ? failure.error.message : `${failure.path} failed`;
        console.error(`[getSiteContent] ${failure.label}: ${detail}`);
      }
      if (fatal.length === 1 && fatal[0]) throw fatal[0].error;
      throw new Error(
        fatal
          .map((failure) =>
            failure.error instanceof Error
              ? failure.error.message
              : `Failed to load ${failure.path}`,
          )
          .join("; "),
      );
    }

    console.warn(
      `[getSiteContent] Backend API unreachable (${failures.map((failure) => failure.path).join(", ")}). Using built-in site content.`,
    );
    return EMPTY_SITE_CONTENT;
  }

  const siteContact = settled[0];
  const services = settled[1];
  const careers = settled[2];
  const teamMembers = settled[3];
  if (
    !siteContact ||
    siteContact.status !== "fulfilled" ||
    !services ||
    services.status !== "fulfilled" ||
    !careers ||
    careers.status !== "fulfilled" ||
    !teamMembers ||
    teamMembers.status !== "fulfilled"
  ) {
    throw new Error(
      "Failed to load site content: site contact, services, careers, or team members did not resolve",
    );
  }

  const settings = siteContactToSettings(siteContact.value);
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
    services: services.value.map(serviceToRow).filter((row) => row.published),
    jobs: careers.value.map(careerToJobRow).filter((row) => row.published),
    team: teamMembers.value.map(teamMemberToRow).filter((row) => row.photoUrl),
  };
}

let siteContentInflight: Promise<Awaited<ReturnType<typeof loadSiteContent>>> | null = null;

export function getSiteContent() {
  if (!siteContentInflight) {
    siteContentInflight = loadSiteContent().finally(() => {
      siteContentInflight = null;
    });
  }
  return siteContentInflight;
}
