export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'COLD_CALL',
  'IMPORT',
  'EVENT',
  'OTHER',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'DEMO_SCHEDULED',
  'DEMO_COMPLETED',
  'PROPOSAL',
  'WON',
  'LOST',
  'ON_HOLD',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const DEFAULT_LEAD_STAGE: LeadStage = 'NEW';

export const TERMINAL_LEAD_STAGES: readonly LeadStage[] = ['WON', 'LOST'];

export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const DEFAULT_LEAD_PRIORITY: LeadPriority = 'MEDIUM';

export const INTEREST_TYPES = [
  'SOFTWARE_DEVELOPMENT',
  'PURCHASE_EXISTING',
  'EXISTING_CUSTOMER_UPDATE',
] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

export const INTERESTED_MODULES = [
  'Loans',
  'Investment',
  'HRMS',
  'CRM',
  'Mobile App',
  'Other',
] as const;
export type InterestedModule = (typeof INTERESTED_MODULES)[number];

export const LEAD_ACTIVITY_TYPES = [
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'NOTE',
  'CALL',
  'FOLLOW_UP',
  'IMPORT',
  'DEMO_SCHEDULED',
  'DEMO_COMPLETED',
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const MANUAL_ACTIVITY_TYPES = [
  'NOTE',
  'CALL',
  'FOLLOW_UP',
  'DEMO_SCHEDULED',
  'DEMO_COMPLETED',
] as const;
export type ManualActivityType = (typeof MANUAL_ACTIVITY_TYPES)[number];

export const FOLLOW_UP_FILTERS = ['today', 'overdue', 'upcoming'] as const;
export type FollowUpFilter = (typeof FOLLOW_UP_FILTERS)[number];

export const FOLLOW_UP_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const CALL_OUTCOMES = [
  'CONNECTED',
  'NO_ANSWER',
  'BUSY',
  'VOICEMAIL',
  'WRONG_NUMBER',
  'CALLBACK_REQUESTED',
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const DEMO_MODES = ['ONLINE', 'IN_PERSON'] as const;
export type DemoMode = (typeof DEMO_MODES)[number];

export const LEAD_SORT_FIELDS = ['createdAt', 'nextFollowUpAt'] as const;
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];

export const LEAD_PHONE_REGEX = /^[+\d][\d\s-]{7,16}$/;

export const LEAD_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
export const LEAD_IMPORT_MAX_ROWS = 2000;
export const LEAD_EXPORT_MAX_ROWS = 10_000;
