import { parseMonthFilter } from '../../expenses/utils/expense-date.util';

export function expenseDateForFixedMonth(
  month: string,
  dayOfMonth: number,
): Date {
  const { start } = parseMonthFilter(month);
  const year = start.getUTCFullYear();
  const monthIndex = start.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(Date.UTC(year, monthIndex, day));
}
