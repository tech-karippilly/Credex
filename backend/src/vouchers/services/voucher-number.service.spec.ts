import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { VoucherCounter } from '../schemas/voucher-counter.schema';
import { VoucherNumberService } from './voucher-number.service';

describe('VoucherNumberService', () => {
  let service: VoucherNumberService;
  const findOneAndUpdate = jest.fn();

  beforeEach(async () => {
    findOneAndUpdate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherNumberService,
        {
          provide: getModelToken(VoucherCounter.name),
          useValue: {
            findOneAndUpdate: (...args: unknown[]) => ({
              exec: () => findOneAndUpdate(...args),
            }),
          },
        },
      ],
    }).compile();

    service = module.get(VoucherNumberService);
  });

  it('formats voucher numbers with padded sequence', () => {
    expect(service.formatVoucherNumber(2026, 1)).toBe('VCH-2026-000001');
    expect(service.formatVoucherNumber(2026, 42)).toBe('VCH-2026-000042');
  });

  it('generates voucher numbers atomically per year', async () => {
    findOneAndUpdate.mockResolvedValue({ year: 2026, seq: 7 });

    const number = await service.generateVoucherNumber(
      new Date('2026-10-08T00:00:00.000Z'),
    );

    expect(number).toBe('VCH-2026-000007');
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { year: 2026 },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  });
});
