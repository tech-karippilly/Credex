import { PAYMENT_MODES } from '../constants/voucher.constants';

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

export function formatPaymentModeLabel(mode: string): string {
  if (PAYMENT_MODE_LABELS[mode]) {
    return PAYMENT_MODE_LABELS[mode];
  }
  return PAYMENT_MODES.includes(mode as (typeof PAYMENT_MODES)[number])
    ? mode
    : mode;
}

export function formatInrAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function formatVoucherDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString('en-IN', { dateStyle: 'medium' });
}
