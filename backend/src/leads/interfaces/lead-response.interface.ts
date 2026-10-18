export interface LeadAssigneeResponse {
  id: string;
  name: string;
  email: string;
}

export interface LeadResponse {
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
  sourceEnquiryId: string | null;
  lastActivityAt: string | null;
  lastActivitySummary: string | null;
  lastActivityType: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListResult {
  items: LeadResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadSummaryResponse {
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
}

export interface LeadActivityResponse {
  id: string;
  leadId: string;
  type: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  summary: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface LeadActivityListResult {
  items: LeadActivityResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadImportIssue {
  rowNumber: number;
  field?: string;
  message: string;
}

export interface LeadImportPreviewRow {
  rowNumber: number;
  status: 'valid' | 'invalid' | 'duplicate';
  messages: string[];
  values: Record<string, string>;
}

export interface LeadImportPreviewResponse {
  filename: string;
  format: 'xlsx' | 'csv';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: LeadImportPreviewRow[];
  issues: LeadImportIssue[];
}

export interface LeadImportCommitResponse extends LeadImportPreviewResponse {
  inserted: number;
  skipped: number;
}
