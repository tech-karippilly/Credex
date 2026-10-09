const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpenseDate(value: string): Date {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw new Error('Invalid date');
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date');
  }

  return date;
}

export function formatExpenseDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseMonthFilter(month: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    throw new Error('Invalid month');
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error('Invalid month');
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { start, end };
}
