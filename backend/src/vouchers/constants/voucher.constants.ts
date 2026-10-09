export const VOUCHER_CURRENCY = 'INR';

export const VOUCHER_DOCUMENT_FOLDER = 'credex/vouchers';

export const VOUCHER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const VOUCHER_DOCUMENT_MIME_REGEX =
  /^(image\/jpeg|image\/jpg|image\/png|application\/pdf)$/;

export const VOUCHER_TYPES = ['PAYMENT', 'RECEIPT', 'GENERAL'] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];

export const VOUCHER_STATUSES = ['DRAFT', 'COMPLETED', 'CANCELLED'] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

export const PAYMENT_MODES = [
  'CASH',
  'BANK_TRANSFER',
  'UPI',
  'CARD',
  'CHEQUE',
  'OTHER',
] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const DEFAULT_VOUCHER_STATUS: VoucherStatus = 'COMPLETED';

export const VOUCHER_DELIVERY_CHANNELS = ['EMAIL', 'WHATSAPP'] as const;
export type VoucherDeliveryChannel =
  (typeof VOUCHER_DELIVERY_CHANNELS)[number];

export const VOUCHER_DELIVERY_STATUSES = [
  'ACCEPTED',
  'DELIVERED',
  'FAILED',
] as const;
export type VoucherDeliveryStatus =
  (typeof VOUCHER_DELIVERY_STATUSES)[number];
