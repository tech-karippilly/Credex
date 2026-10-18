import { BadRequestException } from '@nestjs/common';
import {
  formatExpenseDate,
  parseExpenseDate,
} from '../../expenses/utils/expense-date.util';

export function parseLeadDate(value: string, label = 'date'): Date {
  try {
    return parseExpenseDate(value);
  } catch {
    throw new BadRequestException(`Invalid ${label}`);
  }
}

export function formatLeadDate(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }
  return formatExpenseDate(date);
}

export function utcDayRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export function assertDateOrder(from?: string, to?: string): void {
  if (from && to && from > to) {
    throw new BadRequestException('From date cannot be later than To date.');
  }
}
