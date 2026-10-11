import { BadRequestException } from '@nestjs/common';
import { buildPaymentFieldFilter } from './payment-filter.util';

describe('payment list filters', () => {
  it('combines method, status, payee, cheque, and UTR filters', () => {
    const filter = buildPaymentFieldFilter({
      paymentMethod: 'CHEQUE',
      status: 'ISSUED',
      payee: 'Acme',
      chequeNumber: 'CHQ-10',
      reference: 'UTR.99',
      from: '2026-10-01',
      to: '2026-10-11',
    });

    expect(filter.paymentMethod).toBe('CHEQUE');
    expect(filter.status).toBe('ISSUED');
    expect(filter).not.toHaveProperty('$or');
    expect(filter.payee).toBeInstanceOf(RegExp);
    expect(filter.chequeNumber).toBeInstanceOf(RegExp);
    expect(filter.referenceNumber).toBeInstanceOf(RegExp);
    expect((filter.payee as RegExp).test('acme vendors')).toBe(true);
    expect((filter.chequeNumber as RegExp).test('chq-100')).toBe(true);
    expect((filter.referenceNumber as RegExp).test('utr.99')).toBe(true);
    expect((filter.referenceNumber as RegExp).test('UTR.99 extra')).toBe(true);
    expect(filter.paymentDate).toEqual({
      $gte: expect.any(Date),
      $lte: expect.any(Date),
    });
  });

  it('rejects a from date later than the to date', () => {
    expect(() =>
      buildPaymentFieldFilter({ from: '2026-10-11', to: '2026-10-01' }),
    ).toThrow(BadRequestException);
  });
});
