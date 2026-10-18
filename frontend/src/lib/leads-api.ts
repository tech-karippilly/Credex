import { apiDownload, apiRequest } from "./api";

export const LEAD_SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "COLD_CALL",
  "IMPORT",
  "EVENT",
  "OTHER",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "DEMO_SCHEDULED",
  "DEMO_COMPLETED",
  "PROPOSAL",
  "WON",
  "LOST",
  "ON_HOLD",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const INTEREST_TYPES = [
  "SOFTWARE_DEVELOPMENT",
  "PURCHASE_EXISTING",
  "EXISTING_CUSTOMER_UPDATE",
] as const;

export const INTERESTED_MODULES = [
  "Loans",
  "Investment",
  "HRMS",
  "CRM",
  "Mobile App",
  "Other",
] as const;

export const CALL_OUTCOMES = [
  "CONNECTED",
  "NO_ANSWER",
  "BUSY",
  "VOICEMAIL",
  "WRONG_NUMBER",
  "CALLBACK_REQUESTED",
] as const;

export type Lead = {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  source: string;
  stage: string;
  priority: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  assignedUserEmail: string | null;
  interestType: string | null;
  interestedModules: string[];
  requestedFeatures: string | null;
  changeRequests: string | null;
  businessRequirements: string | null;
  estimatedBudget: number | null;
  expectedTimeline: string | null;
  decisionMaker: string | null;
  nextFollowUpAt: string | null;
  nextAction: string | null;
  notes: string | null;
  lastActivityAt: string | null;
  lastActivitySummary: string | null;
  lastActivityType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadListResult = {
  items: Lead[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type LeadSummary = {
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  demoScheduled: number;
  demoCompleted: number;
  proposal: number;
  won: number;
  lost: number;
  onHold: number;
  followUpsDueToday: number;
  overdueFollowUps: number;
  upcomingFollowUps: number;
  assignedToMe: number;
  byStage: { stage: string; count: number }[];
};

export type LeadAssignee = { id: string; name: string; email: string };

export type LeadActivity = {
  id: string;
  leadId: string;
  type: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  summary: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type LeadActivityListResult = {
  items: LeadActivity[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type LeadDraft = {
  companyName: string;
  contactName: string;
  phone: string;
  alternatePhone: string;
  email: string;
  website: string;
  location: string;
  source: string;
  stage: string;
  priority: string;
  assignedUserId: string;
  interestType: string;
  interestedModules: string[];
  requestedFeatures: string;
  changeRequests: string;
  businessRequirements: string;
  estimatedBudget: string;
  expectedTimeline: string;
  decisionMaker: string;
  nextFollowUpAt: string;
  nextAction: string;
  notes: string;
};

export type LeadListQuery = {
  search?: string;
  stage?: string;
  assignedUserId?: string;
  source?: string;
  priority?: string;
  followUp?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type LeadImportPreview = {
  filename: string;
  format: "xlsx" | "csv";
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: {
    rowNumber: number;
    status: "valid" | "invalid" | "duplicate";
    messages: string[];
    values: Record<string, string>;
  }[];
  issues: { rowNumber: number; message: string }[];
  inserted?: number;
  skipped?: number;
};

function queryString(params?: LeadListQuery & { format?: string }): string {
  const search = new URLSearchParams();
  if (!params) return "";
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `?${suffix}` : "";
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function toCreatePayload(draft: LeadDraft) {
  const budget = draft.estimatedBudget.trim();
  return {
    companyName: draft.companyName.trim(),
    contactName: draft.contactName.trim(),
    phone: draft.phone.trim(),
    alternatePhone: optional(draft.alternatePhone),
    email: optional(draft.email),
    website: optional(draft.website),
    location: optional(draft.location),
    source: draft.source,
    stage: draft.stage,
    priority: draft.priority,
    assignedUserId: optional(draft.assignedUserId),
    interestType: optional(draft.interestType),
    interestedModules: draft.interestedModules,
    requestedFeatures: optional(draft.requestedFeatures),
    changeRequests: optional(draft.changeRequests),
    businessRequirements: optional(draft.businessRequirements),
    estimatedBudget: budget ? Number(budget) : undefined,
    expectedTimeline: optional(draft.expectedTimeline),
    decisionMaker: optional(draft.decisionMaker),
    nextFollowUpAt: optional(draft.nextFollowUpAt),
    nextAction: optional(draft.nextAction),
    notes: optional(draft.notes),
  };
}

export const leadsApi = {
  list(params?: LeadListQuery): Promise<LeadListResult> {
    return apiRequest<LeadListResult>(`/leads${queryString(params)}`, { auth: true });
  },

  summary(): Promise<LeadSummary> {
    return apiRequest<LeadSummary>("/leads/summary", { auth: true });
  },

  assignees(): Promise<LeadAssignee[]> {
    return apiRequest<LeadAssignee[]>("/leads/assignees", { auth: true });
  },

  get(id: string): Promise<Lead> {
    return apiRequest<Lead>(`/leads/${id}`, { auth: true });
  },

  create(payload: ReturnType<typeof toCreatePayload>): Promise<Lead> {
    return apiRequest<Lead>("/leads", { method: "POST", auth: true, json: payload });
  },

  update(id: string, payload: ReturnType<typeof toCreatePayload>): Promise<Lead> {
    return apiRequest<Lead>(`/leads/${id}`, { method: "PUT", auth: true, json: payload });
  },

  updateStage(id: string, stage: string): Promise<Lead> {
    return apiRequest<Lead>(`/leads/${id}/stage`, { method: "PATCH", auth: true, json: { stage } });
  },

  remove(id: string): Promise<void> {
    return apiRequest<void>(`/leads/${id}`, { method: "DELETE", auth: true });
  },

  activities(id: string, page = 1): Promise<LeadActivityListResult> {
    return apiRequest<LeadActivityListResult>(`/leads/${id}/activities?page=${page}&limit=20`, {
      auth: true,
    });
  },

  addActivity(
    id: string,
    payload: { type: string; summary?: string; payload?: Record<string, unknown> },
  ): Promise<LeadActivity> {
    return apiRequest<LeadActivity>(`/leads/${id}/activities`, {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  previewImport(file: File): Promise<LeadImportPreview> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<LeadImportPreview>("/leads/import/preview", {
      method: "POST",
      auth: true,
      formData,
    });
  },

  commitImport(file: File): Promise<LeadImportPreview> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<LeadImportPreview>("/leads/import", {
      method: "POST",
      auth: true,
      formData,
    });
  },

  downloadTemplate(): Promise<{ blob: Blob; filename: string }> {
    return apiDownload("/leads/import/template");
  },

  export(params?: LeadListQuery & { format?: "xlsx" | "csv" }): Promise<{ blob: Blob; filename: string }> {
    return apiDownload(`/leads/export${queryString(params)}`);
  },
};
