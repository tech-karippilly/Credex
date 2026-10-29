import { apiRequest } from "./api";

export type ExpensesSummaryMonth = {
  month: string;
  totalAmount: number;
  expenseCount: number;
};

export type ExpensesSummary = {
  dateBasis: "invoiceDate";
  month: string;
  year: number;
  monthNumber: number;
  totalAmount: number;
  expenseCount: number;
  previousMonth: ExpensesSummaryMonth;
  changeAmount: number;
  changePercent: number | null;
};

export type ExpensesByCategoryRow = {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
  percent: number;
};

export type ExpensesByCategory = {
  dateBasis: "invoiceDate";
  month: string;
  year: number;
  monthNumber: number;
  totalAmount: number;
  expenseCount: number;
  categories: ExpensesByCategoryRow[];
};

/** Current calendar month as YYYY-MM on a UTC basis (matches expense invoice-date filters). */
export function currentMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function parseMonthKey(month: string): { year: number; monthNumber: number } {
  const [yearPart, monthPart] = month.split("-");
  return { year: Number(yearPart), monthNumber: Number(monthPart) };
}

export function formatMonthKey(year: number, monthNumber: number): string {
  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

export function formatMonthLabel(month: string): string {
  const { year, monthNumber } = parseMonthKey(month);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export const dashboardApi = {
  expensesSummary(month: string) {
    return apiRequest<ExpensesSummary>(
      `/dashboard/expenses-summary?month=${encodeURIComponent(month)}`,
      { auth: true },
    );
  },
  expensesByCategory(month: string) {
    return apiRequest<ExpensesByCategory>(
      `/dashboard/expenses-by-category?month=${encodeURIComponent(month)}`,
      { auth: true },
    );
  },
};
