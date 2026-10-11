import { settlementStatus } from '../../payments/utils/payment-rules';
import { paiseToInr } from '../../expenses/utils/money.util';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CARD: 'Card',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  ISSUED: 'Issued',
  PRESENTED: 'Presented',
  CLEARED: 'Cleared',
  BOUNCED: 'Bounced',
  CANCELLED: 'Cancelled',
  INITIATED: 'Initiated',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const VOUCHER_TYPE_LABELS: Record<string, string> = {
  PAYMENT: 'Payment',
  RECEIPT: 'Receipt',
  GENERAL: 'General',
};

const VOUCHER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const SETTLEMENT_LABELS: Record<string, string> = {
  UNPAID: 'Unpaid',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
};

export function methodLabel(value: string): string {
  return PAYMENT_METHOD_LABELS[value] ?? value;
}

export function paymentStatusLabel(value: string): string {
  return PAYMENT_STATUS_LABELS[value] ?? value;
}

export function voucherTypeLabel(value: string): string {
  return VOUCHER_TYPE_LABELS[value] ?? value;
}

export function voucherStatusLabel(value: string): string {
  return VOUCHER_STATUS_LABELS[value] ?? value;
}

export function settlementLabel(value: string): string {
  return SETTLEMENT_LABELS[value] ?? value;
}

export function voucherSettlement(
  amountPaise: number,
  settledPaise: number | null | undefined,
): {
  amountSettled: number;
  outstandingAmount: number;
  settlementStatus: string;
  settlementLabel: string;
} {
  const settled = settledPaise ?? 0;
  const status = settlementStatus(amountPaise, settled);
  return {
    amountSettled: paiseToInr(settled),
    outstandingAmount: paiseToInr(Math.max(0, amountPaise - settled)),
    settlementStatus: status,
    settlementLabel: settlementLabel(status),
  };
}
