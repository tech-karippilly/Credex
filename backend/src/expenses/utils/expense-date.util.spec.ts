import {
  formatExpenseDate,
  parseExpenseDate,
  parseMonthFilter,
} from './expense-date.util';

describe('expense-date.util', () => {
  it('parses date-only values as UTC midnight without shifting the calendar day', () => {
    const date = parseExpenseDate('2026-10-08');
    expect(date.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect(formatExpenseDate(date)).toBe('2026-10-08');
  });

  it('rejects invalid date formats', () => {
    expect(() => parseExpenseDate('08-10-2026')).toThrow('Invalid date');
    expect(() => parseExpenseDate('2026-13-01')).toThrow('Invalid date');
  });

  it('builds inclusive UTC month bounds', () => {
    const { start, end } = parseMonthFilter('2026-10');
    expect(start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T23:59:59.999Z');
  });
});
