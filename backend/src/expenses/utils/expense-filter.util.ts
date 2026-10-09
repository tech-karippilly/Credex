import { BadRequestException } from '@nestjs/common';
import { ExpenseQueryDto } from '../dto/expense-query.dto';
import { ExpenseReportQueryDto } from '../dto/expense-report-query.dto';
import { formatExpenseDate, parseExpenseDate, parseMonthFilter } from './expense-date.util';

import { Types } from 'mongoose';

export interface ExpenseFilterInput {
  categoryId?: string;
  from?: string;
  to?: string;
  month?: string;
  paidBy?: string;
  search?: string;
}

export function buildExpenseFilter(
  input: ExpenseFilterInput,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.categoryId) {
    filter.categoryId = new Types.ObjectId(input.categoryId);
  }

  if (input.paidBy) {
    filter.paidBy = input.paidBy;
  }

  if (input.month) {
    try {
      const { start, end } = parseMonthFilter(input.month);
      filter.date = { $gte: start, $lte: end };
    } catch {
      throw new BadRequestException('Invalid month filter');
    }
  } else if (input.from || input.to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {};

    if (input.from) {
      try {
        dateFilter.$gte = parseExpenseDate(input.from);
      } catch {
        throw new BadRequestException('Invalid from date');
      }
    }

    if (input.to) {
      try {
        const end = parseExpenseDate(input.to);
        end.setUTCHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      } catch {
        throw new BadRequestException('Invalid to date');
      }
    }

    filter.date = dateFilter;
  }

  if (input.search) {
    const escaped = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [
      { expenseName: regex },
      { paidBy: regex },
      { notes: regex },
    ];
  }

  return filter;
}

export function buildExpenseFilterFromQuery(
  query: ExpenseQueryDto,
): Record<string, unknown> {
  return buildExpenseFilter({
    categoryId: query.categoryId,
    from: query.from,
    to: query.to,
    month: query.month,
    paidBy: query.paidBy,
    search: query.search,
  });
}

export function buildExpenseFilterFromReportQuery(
  query: ExpenseReportQueryDto,
): Record<string, unknown> {
  return buildExpenseFilter({
    categoryId: query.categoryId,
    from: query.from,
    to: query.to,
    month: query.month,
    paidBy: query.paidBy,
  });
}

export function reportMetaFromQuery(query: ExpenseReportQueryDto): {
  from?: string;
  to?: string;
  month?: string;
} {
  return {
    from: query.from,
    to: query.to,
    month: query.month,
  };
}

export function expenseDateKey(date: Date): string {
  return formatExpenseDate(date);
}

export function expenseMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
