import { ExpenseCategorySummary } from '../../expenses/interfaces/expense-response.interface';
import { ExpenseResponse } from '../../expenses/interfaces/expense-response.interface';

export interface FixedExpenseResponse {
  id: string;
  expenseName: string;
  categoryId: string;
  category: ExpenseCategorySummary;
  paidBy: string;
  amount: number;
  currency: string;
  dayOfMonth: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FixedExpenseListResponse {
  items: FixedExpenseResponse[];
  totalMonthlyAmount: number;
}

export interface GenerateFixedExpensesResponse {
  month: string;
  created: ExpenseResponse[];
  skipped: { fixedExpenseId: string; expenseName: string; reason: string }[];
}
