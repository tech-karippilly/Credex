import { formatLedgerDate, localCalendarDate } from "./expense-form";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
  type Lead,
  type LeadDraft,
} from "./leads-api";

const PHONE_RE = /^[+\d][\d\s-]{7,16}$/;

export function emptyLeadDraft(): LeadDraft {
  return {
    companyName: "",
    contactName: "",
    phone: "",
    alternatePhone: "",
    email: "",
    website: "",
    location: "",
    source: "REFERRAL",
    stage: "NEW",
    priority: "MEDIUM",
    assignedUserId: "",
    interestType: "",
    interestedModules: [],
    requestedFeatures: "",
    changeRequests: "",
    businessRequirements: "",
    estimatedBudget: "",
    expectedTimeline: "",
    decisionMaker: "",
    nextFollowUpAt: "",
    nextAction: "",
    notes: "",
  };
}

export function draftFromLead(lead: Lead): LeadDraft {
  return {
    companyName: lead.companyName,
    contactName: lead.contactName,
    phone: lead.phone,
    alternatePhone: lead.alternatePhone ?? "",
    email: lead.email ?? "",
    website: lead.website ?? "",
    location: lead.location ?? "",
    source: lead.source,
    stage: lead.stage,
    priority: lead.priority,
    assignedUserId: lead.assignedUserId ?? "",
    interestType: lead.interestType ?? "",
    interestedModules: lead.interestedModules ?? [],
    requestedFeatures: lead.requestedFeatures ?? "",
    changeRequests: lead.changeRequests ?? "",
    businessRequirements: lead.businessRequirements ?? "",
    estimatedBudget: lead.estimatedBudget == null ? "" : String(lead.estimatedBudget),
    expectedTimeline: lead.expectedTimeline ?? "",
    decisionMaker: lead.decisionMaker ?? "",
    nextFollowUpAt: lead.nextFollowUpAt ?? "",
    nextAction: lead.nextAction ?? "",
    notes: lead.notes ?? "",
  };
}

export function validateLeadDraft(draft: LeadDraft): Partial<Record<keyof LeadDraft, string>> {
  const errors: Partial<Record<keyof LeadDraft, string>> = {};
  if (!draft.companyName.trim()) errors.companyName = "Company name is required.";
  if (!draft.contactName.trim()) errors.contactName = "Contact name is required.";
  if (!PHONE_RE.test(draft.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (draft.alternatePhone.trim() && !PHONE_RE.test(draft.alternatePhone.trim())) {
    errors.alternatePhone = "Enter a valid alternate phone number.";
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!LEAD_SOURCES.includes(draft.source as (typeof LEAD_SOURCES)[number])) {
    errors.source = "Select a source.";
  }
  if (!LEAD_STAGES.includes(draft.stage as (typeof LEAD_STAGES)[number])) {
    errors.stage = "Select a stage.";
  }
  if (!LEAD_PRIORITIES.includes(draft.priority as (typeof LEAD_PRIORITIES)[number])) {
    errors.priority = "Select a priority.";
  }
  if (draft.estimatedBudget.trim()) {
    const amount = Number(draft.estimatedBudget);
    if (!Number.isFinite(amount) || amount < 0) errors.estimatedBudget = "Budget must be 0 or more.";
  }
  return errors;
}

export function stageLabel(stage: string): string {
  return stage.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}

export function formatLeadDate(value: string | null | undefined): string {
  if (!value) return "—";
  return formatLedgerDate(value);
}

export { localCalendarDate };

export function isSpreadsheetName(name: string): { ok: true } | { ok: false; message: string } {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xls") && !lower.endsWith(".xlsx")) {
    return { ok: false, message: "Excel 97-2003 (.xls) files are not supported. Upload an .xlsx or .csv file." };
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".csv")) return { ok: true };
  return { ok: false, message: "Upload an .xlsx or .csv file." };
}
