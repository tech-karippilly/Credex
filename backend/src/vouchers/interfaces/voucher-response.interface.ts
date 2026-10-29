export interface VoucherCategorySummary {
  id: string;
  name: string;
}

export interface VoucherExpenseSummary {
  id: string;
  expenseName: string;
  amount: number;
  /** Supplier invoice date on the linked expense; independent of voucherDate. */
  invoiceDate: string | null;
}

export interface VoucherExpenseDetail extends VoucherExpenseSummary {
  paidBy: string;
  category: VoucherCategorySummary | null;
  notes: string;
  /** Date the company recorded / received the invoice, when tracked. */
  receivedDate: string | null;
  receipt: VoucherDocumentSummary | null;
}

export interface VoucherDocumentSummary {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
}

export interface VoucherDeliveryAttemptResponse {
  channel: string;
  recipient: string;
  status: string;
  providerMessageId?: string;
  errorSummary?: string;
  attemptedAt: string;
}

export interface VoucherPaymentHistoryItem {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  status: string;
  /** Amount allocated from this payment to the voucher (INR). */
  allocatedAmount: number;
  /** Full payment amount (INR); may exceed allocatedAmount when split across vouchers. */
  paymentAmount: number;
  referenceNumber: string;
  chequeNumber: string;
  chequeDate: string | null;
  transferMethod: string;
  sourceAccount: string;
}

export interface VoucherResponse {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  title: string;
  description: string;
  paidBy: string;
  payee: string;
  amount: number;
  amountPaid: number;
  outstandingAmount: number;
  availableToAllocate: number;
  /** Amount reserved by non-void payment allocations (INR). */
  amountReserved: number;
  settlementStatus: string;
  currency: string;
  paymentMode: string;
  categoryId: string | null;
  category: VoucherCategorySummary | null;
  expenseId: string | null;
  expense: VoucherExpenseSummary | null;
  referenceNumber: string;
  notes: string;
  document: VoucherDocumentSummary | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Full voucher payload for the details screen. */
export interface VoucherDetailResponse extends Omit<VoucherResponse, 'expense'> {
  expense: VoucherExpenseDetail | null;
  payments: VoucherPaymentHistoryItem[];
  deliveryAttempts: VoucherDeliveryAttemptResponse[];
}

export interface VoucherSettlementCounts {
  unpaid: number;
  partiallyPaid: number;
  paid: number;
  /** Sum of outstanding balances (INR) across vouchers matching the non-settlement filters. */
  totalOutstandingAmount: number;
}

export interface VoucherListResponse {
  items: VoucherResponse[];
  settlementCounts: VoucherSettlementCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
