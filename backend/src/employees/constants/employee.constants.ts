export const EMPLOYEE_STATUSES = ['onboarding', 'active', 'exited'] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['full_time', 'contract'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

/** Created the first time the department list is empty. */
export const DEFAULT_EMPLOYEE_DEPARTMENTS = [
  'Marketing',
  'Support',
  'QA',
] as const;

export const EMPLOYEE_DOCUMENT_KINDS = [
  'photo',
  'id-proof',
  'pan',
  'bank-proof',
  'offer-letter',
] as const;

export type EmployeeDocumentKind = (typeof EMPLOYEE_DOCUMENT_KINDS)[number];

export const EMPLOYEE_DOCUMENT_FIELDS = {
  photo: 'photo',
  'id-proof': 'idProof',
  pan: 'pan',
  'bank-proof': 'bankProof',
  'offer-letter': 'offerLetter',
} as const satisfies Record<
  EmployeeDocumentKind,
  'photo' | 'idProof' | 'pan' | 'bankProof' | 'offerLetter'
>;

export const EMPLOYEE_CODE_PREFIX = 'NF';

export const EMPLOYEE_DOCUMENT_FOLDER = 'neuraforge/employees';

export const EMPLOYEE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const EMPLOYEE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const EMPLOYEE_ADDRESS_MAX_LENGTH = 500;
