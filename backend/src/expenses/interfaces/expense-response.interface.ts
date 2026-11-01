import { SettlementStatus } from '../../payments/constants/payment.constants';

export interface ExpenseReceiptResponse {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
}

export interface ExpenseCategorySummary {
  id: string;
  name: string;
}

export interface ExpenseResponse {
  id: string;
  expenseName: string;
  categoryId: string;
  category: ExpenseCategorySummary;
  paidBy: string;
  amount: number;
  paymentStatus: SettlementStatus;
  currency: string;
  date: string;
  receipt: ExpenseReceiptResponse | null;
  notes: string;
  fixedExpenseId: string | null;
  generatedForMonth: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseListResponse {
  items: ExpenseResponse[];
  totalAmount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReceiptAnalysisResponse {
  expenseName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  paidBy: string | null;
  amount: number | null;
  date: string | null;
  notes: string | null;
  confidence?: number;
}
