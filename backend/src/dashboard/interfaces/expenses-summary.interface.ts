export interface ExpensesSummaryMonth {
  month: string;
  totalAmount: number;
  expenseCount: number;
}

export interface ExpensesSummaryResponse {
  /** Invoice / bill date field used for the month filter. */
  dateBasis: 'invoiceDate';
  month: string;
  year: number;
  monthNumber: number;
  totalAmount: number;
  expenseCount: number;
  previousMonth: ExpensesSummaryMonth;
  changeAmount: number;
  /** Null when the previous month total is zero (undefined percent change). */
  changePercent: number | null;
}
