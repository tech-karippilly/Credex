import { PaymentMode } from '../../vouchers/constants/voucher.constants';
import {
  CHEQUE_STATUSES,
  IMMEDIATE_STATUSES,
  OPEN_STATUSES,
  PaymentStatus,
  SETTLING_STATUSES,
  SETTLEMENT_STATUSES,
  SettlementStatus,
  TRANSFER_STATUSES,
  VOID_STATUSES,
} from '../constants/payment.constants';

const CHEQUE_TRANSITIONS: Record<string, readonly string[]> = {
  ISSUED: ['PRESENTED', 'CLEARED', 'CANCELLED'],
  PRESENTED: ['CLEARED', 'BOUNCED', 'CANCELLED'],
  CLEARED: ['BOUNCED'],
  BOUNCED: [],
  CANCELLED: [],
};

const TRANSFER_TRANSITIONS: Record<string, readonly string[]> = {
  INITIATED: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  FAILED: [],
  CANCELLED: [],
};

const IMMEDIATE_TRANSITIONS: Record<string, readonly string[]> = {
  COMPLETED: ['CANCELLED'],
  CANCELLED: [],
};

export function statusesForMethod(method: string): readonly string[] {
  if (method === 'CHEQUE') return CHEQUE_STATUSES;
  if (method === 'BANK_TRANSFER') return TRANSFER_STATUSES;
  return IMMEDIATE_STATUSES;
}

export function defaultStatus(method: string): PaymentStatus {
  if (method === 'CHEQUE') return 'ISSUED';
  if (method === 'BANK_TRANSFER') return 'INITIATED';
  return 'COMPLETED';
}

export function isVoidStatus(status: string): boolean {
  return (VOID_STATUSES as readonly string[]).includes(status);
}

export function countsAsSettled(status: string): boolean {
  return (SETTLING_STATUSES as readonly string[]).includes(status);
}

export function countsAsReserved(status: string): boolean {
  return !isVoidStatus(status);
}

export function isFinanciallyLocked(status: string): boolean {
  return !(OPEN_STATUSES as readonly string[]).includes(status);
}

export function allowedStatusTransitions(
  method: string,
  status: string,
): string[] {
  const table =
    method === 'CHEQUE'
      ? CHEQUE_TRANSITIONS
      : method === 'BANK_TRANSFER'
        ? TRANSFER_TRANSITIONS
        : IMMEDIATE_TRANSITIONS;
  return [...(table[status] ?? [])];
}

export function canTransition(
  method: string,
  from: string,
  to: string,
): boolean {
  return allowedStatusTransitions(method, from).includes(to);
}

export function settlementStatus(
  amountPaise: number,
  settledPaise: number,
): SettlementStatus {
  if (settledPaise <= 0) return 'UNPAID';
  if (settledPaise < amountPaise) return 'PARTIALLY_PAID';
  return 'PAID';
}

export function validateAllocationTotals(
  paymentPaise: number,
  amountsPaise: number[],
): string | null {
  if (amountsPaise.some((amount) => !Number.isSafeInteger(amount) || amount < 1)) {
    return 'Each allocation must be a positive amount in paise';
  }

  if (amountsPaise.length === 0) return null;

  const allocated = amountsPaise.reduce((sum, amount) => sum + amount, 0);
  if (allocated !== paymentPaise) {
    return 'Payment amount must equal the total allocated to the selected vouchers';
  }

  return null;
}

export function allocationDeltas(
  current: { voucherId: string; amountPaise: number }[],
  next: { voucherId: string; amountPaise: number }[],
): { voucherId: string; deltaPaise: number }[] {
  const totals = new Map<string, number>();

  for (const row of current) {
    totals.set(row.voucherId, (totals.get(row.voucherId) ?? 0) - row.amountPaise);
  }

  for (const row of next) {
    totals.set(row.voucherId, (totals.get(row.voucherId) ?? 0) + row.amountPaise);
  }

  return [...totals.entries()]
    .filter(([, deltaPaise]) => deltaPaise !== 0)
    .map(([voucherId, deltaPaise]) => ({ voucherId, deltaPaise }));
}

export function maskAccount(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function normalizeInstrument(value: string): string {
  return value.trim().toUpperCase();
}

export function isKnownSettlementStatus(value: string): value is SettlementStatus {
  return (SETTLEMENT_STATUSES as readonly string[]).includes(value);
}

export function methodRequiresAccount(method: PaymentMode | string): boolean {
  return method === 'CHEQUE' || method === 'BANK_TRANSFER';
}
