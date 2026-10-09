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
  currency: string;
  date: string;
  receipt: ExpenseReceiptResponse | null;
  notes: string;
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
