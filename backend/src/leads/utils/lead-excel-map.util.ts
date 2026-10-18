import {
  INTEREST_TYPES,
  INTERESTED_MODULES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from '../constants/lead.constants';
import { cellText } from './lead-normalize.util';

export const LEAD_IMPORT_HEADERS = [
  'Company Name',
  'Contact Name',
  'Phone',
  'Alternate Phone',
  'Email',
  'Website',
  'Location',
  'Source',
  'Stage',
  'Priority',
  'Assigned User Email',
  'Interest Type',
  'Interested Modules',
  'Requested Features',
  'Change Requests',
  'Business Requirements',
  'Estimated Budget',
  'Expected Timeline',
  'Decision Maker',
  'Next Follow-up Date',
  'Next Action',
  'Notes',
] as const;

export type LeadImportField =
  | 'companyName'
  | 'contactName'
  | 'phone'
  | 'alternatePhone'
  | 'email'
  | 'website'
  | 'location'
  | 'source'
  | 'stage'
  | 'priority'
  | 'assignedUserEmail'
  | 'interestType'
  | 'interestedModules'
  | 'requestedFeatures'
  | 'changeRequests'
  | 'businessRequirements'
  | 'estimatedBudget'
  | 'expectedTimeline'
  | 'decisionMaker'
  | 'nextFollowUpAt'
  | 'nextAction'
  | 'notes';

const HEADER_ALIASES: Record<string, LeadImportField> = {
  companyname: 'companyName',
  company: 'companyName',
  organisation: 'companyName',
  organization: 'companyName',
  contactname: 'contactName',
  contactperson: 'contactName',
  contact: 'contactName',
  name: 'contactName',
  phone: 'phone',
  phonenumber: 'phone',
  mobile: 'phone',
  alternatephone: 'alternatePhone',
  alternatephonenumber: 'alternatePhone',
  email: 'email',
  emailaddress: 'email',
  website: 'website',
  location: 'location',
  city: 'location',
  source: 'source',
  leadsource: 'source',
  stage: 'stage',
  status: 'stage',
  pipelinestage: 'stage',
  priority: 'priority',
  assigneduseremail: 'assignedUserEmail',
  assignedemail: 'assignedUserEmail',
  assigneeemail: 'assignedUserEmail',
  assignedto: 'assignedUserEmail',
  interesttype: 'interestType',
  interestedmodules: 'interestedModules',
  modules: 'interestedModules',
  requestedfeatures: 'requestedFeatures',
  changerequests: 'changeRequests',
  businessrequirements: 'businessRequirements',
  estimatedbudget: 'estimatedBudget',
  budget: 'estimatedBudget',
  expectedtimeline: 'expectedTimeline',
  timeline: 'expectedTimeline',
  decisionmaker: 'decisionMaker',
  nextfollowupdate: 'nextFollowUpAt',
  nextfollowup: 'nextFollowUpAt',
  followupdate: 'nextFollowUpAt',
  nextaction: 'nextAction',
  notes: 'notes',
  note: 'notes',
};

export function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function mapHeader(value: string): LeadImportField | null {
  return HEADER_ALIASES[normalizeHeader(value)] ?? null;
}

export function headerMapping(headers: string[]): {
  mapping: Partial<Record<LeadImportField, number>>;
  unknown: string[];
} {
  const mapping: Partial<Record<LeadImportField, number>> = {};
  const unknown: string[] = [];
  headers.forEach((header, index) => {
    const trimmed = header.trim();
    if (!trimmed) {
      return;
    }
    const field = mapHeader(trimmed);
    if (!field) {
      unknown.push(trimmed);
      return;
    }
    if (mapping[field] === undefined) {
      mapping[field] = index;
    }
  });
  return { mapping, unknown };
}

export function parseEnum(
  value: string,
  allowed: readonly string[],
): string | null {
  const compact = value.trim().replace(/[\s-]+/g, '_').toUpperCase();
  const match = allowed.find((item) => item === compact);
  if (match) {
    return match;
  }
  const spaced = value.trim().replace(/[_-]+/g, ' ');
  return (
    allowed.find((item) => item.replace(/_/g, ' ').toLowerCase() === spaced.toLowerCase()) ??
    null
  );
}

export function parseModules(value: string): string[] {
  if (!value.trim()) {
    return [];
  }
  const parts = value.split(/[,;/|]/).map((part) => part.trim()).filter(Boolean);
  const matched: string[] = [];
  for (const part of parts) {
    const found = INTERESTED_MODULES.find(
      (item) => item.toLowerCase() === part.toLowerCase(),
    );
    if (found && !matched.includes(found)) {
      matched.push(found);
    }
  }
  return matched;
}

export function parseBudget(value: string): number | null {
  const cleaned = value.replace(/[,₹\s]/g, '');
  if (!cleaned) {
    return null;
  }
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

export const LEAD_ENUM_LOOKUPS = {
  source: LEAD_SOURCES,
  stage: LEAD_STAGES,
  priority: LEAD_PRIORITIES,
  interestType: INTEREST_TYPES,
};

export function rowValues(
  cells: unknown[],
  mapping: Partial<Record<LeadImportField, number>>,
): Record<LeadImportField, string> {
  const values = {} as Record<LeadImportField, string>;
  for (const [field, index] of Object.entries(mapping) as Array<
    [LeadImportField, number]
  >) {
    values[field] = cellText(cells[index]);
  }
  return values;
}
