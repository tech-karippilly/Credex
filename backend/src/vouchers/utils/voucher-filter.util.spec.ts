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
});
