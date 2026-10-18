export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsRegex(value: string): RegExp {
  return new RegExp(escapeRegex(value.trim()), 'i');
}

export function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Digits only, preserving a leading plus for E.164-style values. */
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return plus ? `+${digits}` : digits;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 11000
  );
}

/** Neutralize spreadsheet formula injection in exported cells. */
export function spreadsheetSafe(value: string): string {
  if (value.length === 0) {
    return value;
  }
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value).trim();
}
