export interface VoucherCategorySummary {
  id: string;
  name: string;
}

export interface VoucherExpenseSummary {
  id: string;
  expenseName: string;
  amount: number;
}

export interface VoucherDocumentSummary {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
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

export interface VoucherListResponse {
  items: VoucherResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
