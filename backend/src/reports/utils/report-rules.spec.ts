import { BadRequestException } from '@nestjs/common';
import { ALL_PAYMENT_STATUSES } from '../../payments/constants/payment.constants';
import { countsAsSettled } from '../../payments/utils/payment-rules';
import { voucherSettlement } from './report-labels';
import {
  assertDateOrder,
  reportPeriod,
} from './report-page.util';

describe('report rules', () => {
  it('keeps cleared payment statuses aligned with settlement rules', () => {
    const cleared = ALL_PAYMENT_STATUSES.filter((status) => countsAsSettled(status));
    expect(cleared).toEqual(['CLEARED', 'COMPLETED']);
    for (const status of ['ISSUED', 'PRESENTED', 'INITIATED', 'BOUNCED', 'CANCELLED', 'FAILED']) {
      expect(countsAsSettled(status)).toBe(false);
    }
  });

  it('rejects a from date later than the to date', () => {
    expect(() => assertDateOrder('2026-10-02', '2026-10-01')).toThrow(
      BadRequestException,
    );
    expect(() => assertDateOrder('2026-10-01', '2026-10-01')).not.toThrow();
    expect(() => assertDateOrder(undefined, '2026-10-01')).not.toThrow();
  });

  it('describes an inclusive reporting period without inventing dates', () => {
    expect(reportPeriod('2026-10-01', '2026-10-31').label).toBe(
      '2026-10-01 to 2026-10-31',
    );
    expect(reportPeriod(undefined, undefined).label).toBe('All dates');
    expect(reportPeriod('2026-10-01', undefined)).toEqual({
      from: '2026-10-01',
      to: null,
      label: 'From 2026-10-01',
    });
  });

  it('uses stored settled paise and does not treat a missing value as a payment', () => {
    expect(voucherSettlement(20000, 0)).toMatchObject({
      amountSettled: 0,
      outstandingAmount: 200,
      settlementStatus: 'UNPAID',
    });
    expect(voucherSettlement(20000, undefined)).toMatchObject({
      amountSettled: 0,
      outstandingAmount: 200,
      settlementStatus: 'UNPAID',
    });
    expect(voucherSettlement(20000, 5000).settlementStatus).toBe('PARTIALLY_PAID');
    expect(voucherSettlement(20000, 20000).settlementStatus).toBe('PAID');
  });
});
