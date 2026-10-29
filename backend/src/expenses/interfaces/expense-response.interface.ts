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

export interface ExpenseLinkedVoucherSummary {
  id: string;
  voucherNumber: string;
  amount: number;
  status: string;
}

export interface ExpenseResponse {
  id: string;
  expenseName: string;
  categoryId: string;
  category: ExpenseCategorySummary;
  paidBy: string;
  amount: number;
  currency: string;
  /** @deprecated Use invoiceDate. Kept for backward compatibility; same value as invoiceDate. */
  date: string;
  /** Supplier invoice / bill date (YYYY-MM-DD). */
  invoiceDate: string;
  /** Date the company received the invoice, when tracked (YYYY-MM-DD). */
  receivedDate: string | null;
  receipt: ExpenseReceiptResponse | null;
  notes: string;
  /** Derived from active vouchers linked via voucher.expenseId. */
  voucherStatus: 'NOT_VOUCHERED' | 'VOUCHERED';
  /** Sum of active linked voucher amounts (INR). */
  voucheredAmount: number;
  /** max(0, expense amount - vouchered amount) in INR. */
  remainingEligibleAmount: number;
  vouchers: ExpenseLinkedVoucherSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseVoucherCounts {
  all: number;
  notVouchered: number;
  vouchered: number;
}

export interface ExpenseListResponse {
  items: ExpenseResponse[];
  totalAmount: number;
  voucherCounts: ExpenseVoucherCounts;
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
  /** Extracted supplier invoice / transaction date. */
  date: string | null;
  invoiceDate: string | null;
  notes: string | null;
  confidence?: number;
}
