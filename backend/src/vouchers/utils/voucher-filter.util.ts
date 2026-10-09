import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { VoucherQueryDto } from '../dto/voucher-query.dto';
import { parseExpenseDate } from '../../expenses/utils/expense-date.util';

export function buildVoucherFilterFromQuery(
  query: VoucherQueryDto,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (query.voucherType) {
    filter.voucherType = query.voucherType;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.categoryId) {
    filter.categoryId = new Types.ObjectId(query.categoryId);
  }

  if (query.from || query.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};

    if (query.from) {
      try {
        dateFilter.$gte = parseExpenseDate(query.from);
      } catch {
        throw new BadRequestException('Invalid from date');
      }
    }

    if (query.to) {
      try {
        const end = parseExpenseDate(query.to);
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      } catch {
        throw new BadRequestException('Invalid to date');
      }
    }

    filter.voucherDate = dateFilter;
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { voucherNumber: regex },
      { title: regex },
      { description: regex },
      { paidBy: regex },
      { payee: regex },
      { referenceNumber: regex },
      { notes: regex },
    ];
  }

  return filter;
}
