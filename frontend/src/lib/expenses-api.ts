import { apiRequest } from "./api";

export type ExpenseReceipt = {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
};

export type Expense = {
  id: string;
  expenseName: string;
  categoryId: string;
  category: { id: string; name: string };
  paidBy: string;
  amount: number;
  currency: string;
  date: string;
  receipt: ExpenseReceipt | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListResult = {
  items: Expense[];
  totalAmount: number;
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
  date: string;
  notes?: string;
};

export const expensesApi = {
  list(params?: { categoryId?: string; limit?: number }): Promise<ExpenseListResult> {
    const search = new URLSearchParams();
    if (params?.categoryId) search.set("categoryId", params.categoryId);
    if (params?.limit) search.set("limit", String(params.limit));
    const q = search.toString();
    return apiRequest<ExpenseListResult>(`/expenses${q ? `?${q}` : ""}`, { auth: true });
  },

  create(payload: CreateExpensePayload): Promise<Expense> {
    return apiRequest<Expense>("/expenses", {
      method: "POST",
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

  listCategories(): Promise<ExpenseCategory[]> {
    return apiRequest<ExpenseCategory[]>("/expense-categories", { auth: true });
  },
};
