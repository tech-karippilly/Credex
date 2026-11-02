import { SettlementStatus } from '../../payments/constants/payment.constants';
import { ExpenseVoucherStatus } from '../utils/expense-voucher.util';

export interface ExpenseLinkedVoucherSummary {
  id: string;
  voucherNumber: string;
}

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
  /** At least one active (draft/completed) voucher linked to this expense. */
  voucherStatus: ExpenseVoucherStatus;
  voucheredAmount: number;
  remainingEligibleAmount: number;
  vouchers: ExpenseLinkedVoucherSummary[];
  currency: string;
  /** Legacy alias for supplier invoice date (same as invoiceDate). */
  date: string;
  invoiceDate: string;
  receivedDate: string | null;
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
  invoiceDate: string | null;
  notes: string | null;
  confidence?: number;
}
