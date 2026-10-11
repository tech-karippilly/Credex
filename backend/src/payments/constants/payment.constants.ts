import { PAYMENT_MODES } from '../../vouchers/constants/voucher.constants';

export const PAYMENT_DOCUMENT_FOLDER = 'credex/payments';

export const PAYMENT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const PAYMENT_DOCUMENT_MIME_REGEX =
  /^(image\/jpeg|image\/jpg|image\/png|application\/pdf)$/;

export const TRANSFER_METHODS = ['NEFT', 'RTGS', 'IMPS', 'OTHER'] as const;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];

export const CHEQUE_STATUSES = [
  'ISSUED',
  'PRESENTED',
  'CLEARED',
  'BOUNCED',
  'CANCELLED',
] as const;

export const TRANSFER_STATUSES = [
  'INITIATED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export const IMMEDIATE_STATUSES = ['COMPLETED', 'CANCELLED'] as const;

export const ALL_PAYMENT_STATUSES = [
  'ISSUED',
  'PRESENTED',
  'CLEARED',
  'BOUNCED',
  'CANCELLED',
  'INITIATED',
  'COMPLETED',
  'FAILED',
] as const;

export type PaymentStatus = (typeof ALL_PAYMENT_STATUSES)[number];

export const SETTLING_STATUSES = ['CLEARED', 'COMPLETED'] as const;

export const VOID_STATUSES = ['BOUNCED', 'CANCELLED', 'FAILED'] as const;

export const OPEN_STATUSES = ['ISSUED', 'PRESENTED', 'INITIATED'] as const;

export const ALLOCATABLE_VOUCHER_TYPES = ['PAYMENT', 'GENERAL'] as const;

export const ALLOCATABLE_VOUCHER_STATUS = 'COMPLETED';

export const SETTLEMENT_STATUSES = [
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
] as const;

export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const PAYMENT_METHODS = PAYMENT_MODES;

export const AUDIT_ACTIONS = [
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'DOCUMENT_ADDED',
  'DOCUMENT_REMOVED',
] as const;
