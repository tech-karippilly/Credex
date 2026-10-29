import { apiRequest } from "./api";

export type ExpenseReceipt = {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
};

export type ExpenseLinkedVoucher = {
  id: string;
  voucherNumber: string;
  amount: number;
  status: string;
};

export type ExpenseVoucherStatus = "NOT_VOUCHERED" | "VOUCHERED";

export type Expense = {
  id: string;
  expenseName: string;
  categoryId: string;
  category: { id: string; name: string };
  paidBy: string;
  amount: number;
  currency: string;
  /** @deprecated Use invoiceDate. Same value as invoiceDate for compatibility. */
  date: string;
  /** Supplier invoice / bill date (YYYY-MM-DD). */
  invoiceDate: string;
  /** Date the company received the invoice, when tracked. */
  receivedDate: string | null;
  receipt: ExpenseReceipt | null;
  notes: string;
  voucherStatus: ExpenseVoucherStatus;
  voucheredAmount: number;
  remainingEligibleAmount: number;
  vouchers: ExpenseLinkedVoucher[];
  createdAt: string;
  updatedAt: string;
};

export type ExpenseVoucherCounts = {
  all: number;
  notVouchered: number;
  vouchered: number;
};

export type ExpenseListResult = {
  items: Expense[];
  totalAmount: number;
  voucherCounts: ExpenseVoucherCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ExpenseCategory = {
  id: string;
  name: string;
  order: number;
};

export type CreateExpensePayload = {
  expenseName: string;
  categoryId: string;
  paidBy: string;
  amount: number;
  invoiceDate: string;
  /** Legacy alias; sent alongside invoiceDate for older API consumers. */
  date?: string;
  receivedDate?: string | null;
  notes?: string;
};

export type UpdateExpensePayload = {
  expenseName?: string;
  categoryId?: string;
  paidBy?: string;
  amount?: number;
  invoiceDate?: string;
  date?: string;
  receivedDate?: string | null;
  notes?: string;
};

export type ExpenseListQuery = {
  categoryId?: string;
  from?: string;
  to?: string;
  voucherStatus?: ExpenseVoucherStatus;
  eligibleForVoucher?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

/** Prefer invoiceDate; fall back to legacy date for older API payloads. */
export function expenseInvoiceDate(expense: Pick<Expense, "invoiceDate" | "date">): string {
  return expense.invoiceDate || expense.date;
}

export function buildExpenseListQuery(params?: ExpenseListQuery): string {
  const search = new URLSearchParams();
  if (params?.categoryId) search.set("categoryId", params.categoryId);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.voucherStatus) search.set("voucherStatus", params.voucherStatus);
  if (params?.eligibleForVoucher) search.set("eligibleForVoucher", "true");
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.limit) search.set("limit", String(params.limit));
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const expensesApi = {
  list(params?: ExpenseListQuery): Promise<ExpenseListResult> {
    return apiRequest<ExpenseListResult>(`/expenses${buildExpenseListQuery(params)}`, {
      auth: true,
    });
  },

  create(payload: CreateExpensePayload): Promise<Expense> {
    return apiRequest<Expense>("/expenses", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateExpensePayload): Promise<Expense> {
    return apiRequest<Expense>(`/expenses/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/expenses/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  uploadReceipt(id: string, file: File): Promise<Expense> {
    const formData = new FormData();
    formData.append("receipt", file);
    return apiRequest<Expense>(`/expenses/${id}/receipt`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  deleteReceipt(id: string): Promise<Expense> {
    return apiRequest<Expense>(`/expenses/${id}/receipt`, {
      method: "DELETE",
      auth: true,
    });
  },

  listCategories(): Promise<ExpenseCategory[]> {
    return apiRequest<ExpenseCategory[]>("/expense-categories", { auth: true });
  },
};
