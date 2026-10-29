import { BadGatewayException } from '@nestjs/common';
import { ReceiptAnalysisResponse } from './interfaces/expense-response.interface';

export function parseReceiptExtraction(
  raw: string,
  allowedCategoryNames: string[],
): ReceiptAnalysisResponse {
  const categorySet = new Set(allowedCategoryNames);
  const json = extractJson(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BadGatewayException(
      'Unable to extract expense details from the receipt',
    );
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BadGatewayException(
      'Unable to extract expense details from the receipt',
    );
  }

  const record = parsed as Record<string, unknown>;

  const expenseName = normalizeOptionalString(record.expenseName);
  const categoryName = normalizeCategory(
    record.category,
    categorySet,
    allowedCategoryNames,
  );
  const paidBy = normalizeOptionalString(record.paidBy);
  const amount = normalizeAmount(record.amount);
  const date = normalizeDate(record.date);
  const notes = normalizeOptionalString(record.notes);
  const confidence = normalizeConfidence(record.confidence);

  const hasAnyField =
    expenseName !== null ||
    categoryName !== null ||
    paidBy !== null ||
    amount !== null ||
    date !== null ||
    notes !== null;

  if (!hasAnyField) {
    throw new BadGatewayException(
      'Unable to extract expense details from the receipt',
    );
  }

  return {
    expenseName,
    categoryId: null,
    categoryName,
    paidBy,
    amount,
    date,
    invoiceDate: date,
    notes,
    ...(confidence !== undefined ? { confidence } : {}),
  };
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 500) : null;
}

function normalizeCategory(
  value: unknown,
  categorySet: Set<string>,
  categoryNames: string[],
): string | null {
  const text = normalizeOptionalString(value);
  if (!text) {
    return null;
  }

  if (categorySet.has(text)) {
    return text;
  }

  const lowered = text.toLowerCase();
  const match = categoryNames.find((name) => name.toLowerCase() === lowered);
  return match ?? null;
}

function normalizeAmount(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return Math.round(numeric * 100) / 100;
}

function normalizeDate(value: unknown): string | null {
  const text = normalizeOptionalString(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return text;
}

function normalizeConfidence(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const clamped = Math.min(1, Math.max(0, numeric));
  return clamped;
}
