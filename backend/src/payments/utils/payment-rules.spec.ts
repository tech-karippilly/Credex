import {
  allocationDeltas,
  allowedStatusTransitions,
  canTransition,
  countsAsReserved,
  countsAsSettled,
  defaultStatus,
  isFinanciallyLocked,
  maskAccount,
  settlementStatus,
  validateAllocationTotals,
} from './payment-rules';

describe('payment rules', () => {
  it('does not treat an issued or presented cheque as settled', () => {
    expect(defaultStatus('CHEQUE')).toBe('ISSUED');
    expect(countsAsSettled('ISSUED')).toBe(false);
    expect(countsAsSettled('PRESENTED')).toBe(false);
    expect(countsAsReserved('ISSUED')).toBe(true);
    expect(countsAsSettled('CLEARED')).toBe(true);
  });

  it('removes bounced and cancelled instruments from reserved and settled funds', () => {
    expect(countsAsSettled('BOUNCED')).toBe(false);
    expect(countsAsReserved('BOUNCED')).toBe(false);
    expect(countsAsSettled('CANCELLED')).toBe(false);
    expect(countsAsReserved('FAILED')).toBe(false);
    expect(countsAsSettled('COMPLETED')).toBe(true);
  });

  it('locks cleared and completed payments against financial edits', () => {
    expect(isFinanciallyLocked('ISSUED')).toBe(false);
    expect(isFinanciallyLocked('INITIATED')).toBe(false);
    expect(isFinanciallyLocked('CLEARED')).toBe(true);
    expect(isFinanciallyLocked('COMPLETED')).toBe(true);
    expect(isFinanciallyLocked('BOUNCED')).toBe(true);
  });

  it('allows a cleared cheque to bounce and a completed payment to be cancelled', () => {
    expect(canTransition('CHEQUE', 'ISSUED', 'CLEARED')).toBe(true);
    expect(canTransition('CHEQUE', 'CLEARED', 'CANCELLED')).toBe(false);
    expect(canTransition('CHEQUE', 'CLEARED', 'BOUNCED')).toBe(true);
    expect(canTransition('BANK_TRANSFER', 'INITIATED', 'COMPLETED')).toBe(true);
    expect(canTransition('CASH', 'COMPLETED', 'CANCELLED')).toBe(true);
    expect(allowedStatusTransitions('CHEQUE', 'BOUNCED')).toEqual([]);
  });

  it('requires a payment with vouchers to equal the allocated total', () => {
    expect(validateAllocationTotals(5000000, [2000000, 1500000, 1500000])).toBeNull();
    expect(validateAllocationTotals(5000000, [])).toBeNull();
    expect(validateAllocationTotals(5000000, [2000000])).toMatch(/equal/i);
    expect(validateAllocationTotals(5000000, [5000001])).toMatch(/equal/i);
    expect(validateAllocationTotals(100, [0])).toMatch(/positive/i);
  });

  it('calculates settlement only from settled paise', () => {
    expect(settlementStatus(5000000, 0)).toBe('UNPAID');
    expect(settlementStatus(5000000, 2000000)).toBe('PARTIALLY_PAID');
    expect(settlementStatus(5000000, 5000000)).toBe('PAID');
  });

  it('computes allocation deltas without duplicating a voucher', () => {
    expect(
      allocationDeltas(
        [{ voucherId: 'a', amountPaise: 1000 }],
        [
          { voucherId: 'a', amountPaise: 400 },
          { voucherId: 'b', amountPaise: 600 },
        ],
      ),
    ).toEqual([
      { voucherId: 'a', deltaPaise: -600 },
      { voucherId: 'b', deltaPaise: 600 },
    ]);
  });

  it('masks bank account values in audit text', () => {
    expect(maskAccount('HDFC-123456789')).toBe('********6789');
    expect(maskAccount('')).toBe('');
  });
});
