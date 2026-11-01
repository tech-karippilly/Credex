import { expenseDateForFixedMonth } from './fixed-expense-date.util';

describe('expenseDateForFixedMonth', () => {
  it('uses the requested day when it exists in the month', () => {
    expect(expenseDateForFixedMonth('2026-03', 15).toISOString()).toBe(
      '2026-03-15T00:00:00.000Z',
    );
  });

  it('caps the day at the last day of a short month', () => {
    expect(expenseDateForFixedMonth('2026-02', 28).toISOString()).toBe(
      '2026-02-28T00:00:00.000Z',
    );
  });
});
