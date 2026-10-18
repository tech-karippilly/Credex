import { BadRequestException } from '@nestjs/common';

/** Exports load every matching row. Above this, the caller must narrow the filters. */
export const REPORT_EXPORT_MAX_ROWS = 10_000;

export function pageWindow(page?: number, limit?: number): {
  page: number;
  limit: number;
  skip: number;
} {
  const safePage = page ?? 1;
  const safeLimit = limit ?? 20;
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function paginationMeta(
  page: number,
  limit: number,
  total: number,
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
} {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/** Inclusive calendar dates compare correctly as YYYY-MM-DD strings. */
export function assertDateOrder(from?: string, to?: string): void {
  if (from && to && from > to) {
    throw new BadRequestException('From date cannot be later than To date.');
  }
}

export function containsRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export function reportPeriod(from?: string, to?: string): {
  from: string | null;
  to: string | null;
  label: string;
} {
  if (from && to) {
    return { from, to, label: `${from} to ${to}` };
  }
  if (from) return { from, to: null, label: `From ${from}` };
  if (to) return { from: null, to, label: `Through ${to}` };
  return { from: null, to: null, label: 'All dates' };
}

export function describedFilters(
  entries: { label: string; value?: string }[],
): { label: string; value: string }[] {
  return entries.filter(
    (entry): entry is { label: string; value: string } =>
      typeof entry.value === 'string' && entry.value.length > 0,
  );
}

export function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
