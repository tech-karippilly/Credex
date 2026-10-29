export interface ExpensesByCategoryRow {
  /** Empty string when the category document is missing. */
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
  /** Share of period total, 0–100 with two decimal places. */
  percent: number;
}

export interface ExpensesByCategoryResponse {
  /** Invoice / bill date field used for the month filter. */
  dateBasis: 'invoiceDate';
  month: string;
  year: number;
  monthNumber: number;
  totalAmount: number;
  expenseCount: number;
  categories: ExpensesByCategoryRow[];
}
