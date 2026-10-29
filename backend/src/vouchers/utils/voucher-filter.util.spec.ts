import { VoucherQueryDto } from '../dto/voucher-query.dto';
import { buildVoucherFilterFromQuery } from './voucher-filter.util';

describe('buildVoucherFilterFromQuery', () => {
  it('builds search and enum filters', () => {
    const filter = buildVoucherFilterFromQuery({
      search: 'AWS',
      voucherType: 'PAYMENT',
      status: 'COMPLETED',
      categoryId: '507f1f77bcf86cd799439011',
      from: '2026-10-01',
      to: '2026-10-31',
    } as VoucherQueryDto);

    expect(filter.voucherType).toBe('PAYMENT');
    expect(filter.status).toBe('COMPLETED');
    expect(filter.$or).toBeDefined();
    expect(filter.voucherDate).toBeDefined();
  });

  it('filters by payment mode', () => {
    const filter = buildVoucherFilterFromQuery({
      paymentMode: 'CHEQUE',
    } as VoucherQueryDto);

    expect(filter.paymentMode).toBe('CHEQUE');
  });

  it('filters by settlement status using settledPaise', () => {
    const unpaid = buildVoucherFilterFromQuery({
      settlementStatus: 'UNPAID',
    } as VoucherQueryDto);
    const partial = buildVoucherFilterFromQuery({
      settlementStatus: 'PARTIALLY_PAID',
    } as VoucherQueryDto);
    const paid = buildVoucherFilterFromQuery({
      settlementStatus: 'PAID',
    } as VoucherQueryDto);

    expect(unpaid.$expr).toEqual({
      $lte: [{ $ifNull: ['$settledPaise', 0] }, 0],
    });
    expect(partial.$expr).toEqual({
      $and: [
        { $gt: [{ $ifNull: ['$settledPaise', 0] }, 0] },
        { $lt: [{ $ifNull: ['$settledPaise', 0] }, '$amountPaise'] },
      ],
    });
    expect(paid.$expr).toEqual({
      $gte: [{ $ifNull: ['$settledPaise', 0] }, '$amountPaise'],
    });
  });
});
