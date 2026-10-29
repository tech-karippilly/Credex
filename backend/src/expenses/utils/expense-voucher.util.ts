import { Types } from 'mongoose';

/** Active vouchers that count toward expense vouchered status / eligibility. */
export const ACTIVE_VOUCHER_STATUSES = ['DRAFT', 'COMPLETED'] as const;

export type ExpenseVoucherStatus = 'NOT_VOUCHERED' | 'VOUCHERED';

export type LinkedVoucherSummaryInput = {
  _id: Types.ObjectId;
  voucherNumber: string;
  amountPaise: number;
  status: string;
};

export type ExpenseVoucherLinkage = {
  voucherStatus: ExpenseVoucherStatus;
  voucheredAmountPaise: number;
  remainingEligibleAmountPaise: number;
  vouchers: {
    id: string;
    voucherNumber: string;
    amountPaise: number;
    status: string;
  }[];
};

export function isActiveLinkedVoucher(status: string): boolean {
  return (ACTIVE_VOUCHER_STATUSES as readonly string[]).includes(status);
}

export function computeExpenseVoucherLinkage(
  expenseAmountPaise: number,
  linkedVouchers: LinkedVoucherSummaryInput[],
): ExpenseVoucherLinkage {
  const active = linkedVouchers.filter((voucher) =>
    isActiveLinkedVoucher(voucher.status),
  );
  const voucheredAmountPaise = active.reduce(
    (sum, voucher) => sum + (voucher.amountPaise ?? 0),
    0,
  );
  const remainingEligibleAmountPaise = Math.max(
    0,
    expenseAmountPaise - voucheredAmountPaise,
  );

  return {
    voucherStatus: active.length > 0 ? 'VOUCHERED' : 'NOT_VOUCHERED',
    voucheredAmountPaise,
    remainingEligibleAmountPaise,
    vouchers: active.map((voucher) => ({
      id: voucher._id.toString(),
      voucherNumber: voucher.voucherNumber,
      amountPaise: voucher.amountPaise,
      status: voucher.status,
    })),
  };
}

/**
 * Fully vouchered = at least one active linked voucher and no remaining
 * eligible amount. An expense with zero vouchers is never fully vouchered.
 */
export function isFullyVouchered(
  expenseAmountPaise: number,
  linkedVouchers: LinkedVoucherSummaryInput[],
): boolean {
  const linkage = computeExpenseVoucherLinkage(
    expenseAmountPaise,
    linkedVouchers,
  );
  return (
    linkage.voucherStatus === 'VOUCHERED' &&
    linkage.remainingEligibleAmountPaise <= 0
  );
}
