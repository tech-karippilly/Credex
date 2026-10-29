import { Types } from 'mongoose';
import {
  computeExpenseVoucherLinkage,
  isFullyVouchered,
} from './expense-voucher.util';

function voucher(
  amountPaise: number,
  status = 'COMPLETED',
  voucherNumber = 'V-1',
) {
  return {
    _id: new Types.ObjectId(),
    voucherNumber,
    amountPaise,
    status,
  };
}

describe('expense-voucher.util', () => {
  it('marks an expense without vouchers as NOT_VOUCHERED', () => {
    const linkage = computeExpenseVoucherLinkage(10_000, []);
    expect(linkage.voucherStatus).toBe('NOT_VOUCHERED');
    expect(linkage.voucheredAmountPaise).toBe(0);
    expect(linkage.remainingEligibleAmountPaise).toBe(10_000);
    expect(isFullyVouchered(10_000, [])).toBe(false);
  });

  it('marks an expense with an active linked voucher as VOUCHERED', () => {
    const linkage = computeExpenseVoucherLinkage(10_000, [
      voucher(4_000, 'COMPLETED', 'V-100'),
    ]);
    expect(linkage.voucherStatus).toBe('VOUCHERED');
    expect(linkage.voucheredAmountPaise).toBe(4_000);
    expect(linkage.remainingEligibleAmountPaise).toBe(6_000);
    expect(linkage.vouchers[0]?.voucherNumber).toBe('V-100');
    expect(isFullyVouchered(10_000, [voucher(4_000)])).toBe(false);
  });

  it('ignores cancelled vouchers for status and eligibility', () => {
    const linkage = computeExpenseVoucherLinkage(10_000, [
      voucher(10_000, 'CANCELLED'),
    ]);
    expect(linkage.voucherStatus).toBe('NOT_VOUCHERED');
    expect(linkage.remainingEligibleAmountPaise).toBe(10_000);
    expect(isFullyVouchered(10_000, [voucher(10_000, 'CANCELLED')])).toBe(
      false,
    );
  });

  it('treats an expense as fully vouchered when active vouchers cover the amount', () => {
    const linked = [voucher(6_000), voucher(4_000, 'DRAFT', 'V-2')];
    expect(isFullyVouchered(10_000, linked)).toBe(true);
    expect(computeExpenseVoucherLinkage(10_000, linked).remainingEligibleAmountPaise).toBe(
      0,
    );
  });

  it('handles missing optional voucher amounts safely', () => {
    const linkage = computeExpenseVoucherLinkage(5_000, [
      {
        _id: new Types.ObjectId(),
        voucherNumber: 'V-x',
        amountPaise: undefined as unknown as number,
        status: 'COMPLETED',
      },
    ]);
    expect(linkage.voucherStatus).toBe('VOUCHERED');
    expect(linkage.voucheredAmountPaise).toBe(0);
    expect(linkage.remainingEligibleAmountPaise).toBe(5_000);
  });
});
