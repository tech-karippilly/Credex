import { apiRequest } from "./api";
import type { Expense } from "./expenses-api";

export type FixedExpense = {
  id: string;
  expenseName: string;
  categoryId: string;
  category: { id: string; name: string };
  paidBy: string;
  amount: number;
  currency: string;
  dayOfMonth: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FixedExpenseListResult = {
  items: FixedExpense[];
  totalMonthlyAmount: number;
};

export type CreateFixedExpensePayload = {
  expenseName: string;
  categoryId: string;
  paidBy: string;
  amount: number;
  dayOfMonth: number;
  notes?: string;
};

export type UpdateFixedExpensePayload = {
  expenseName?: string;
  categoryId?: string;
  paidBy?: string;
  amount?: number;
  dayOfMonth?: number;
  notes?: string;
  isActive?: boolean;
};

export type GenerateFixedExpensesResult = {
  month: string;
  created: Expense[];
  skipped: { fixedExpenseId: string; expenseName: string; reason: string }[];
};

export const fixedExpensesApi = {
  list(): Promise<FixedExpenseListResult> {
    return apiRequest<FixedExpenseListResult>("/fixed-expenses", { auth: true });
  },

  create(payload: CreateFixedExpensePayload): Promise<FixedExpense> {
    return apiRequest<FixedExpense>("/fixed-expenses", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateFixedExpensePayload): Promise<FixedExpense> {
    return apiRequest<FixedExpense>(`/fixed-expenses/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateStatus(id: string, isActive: boolean): Promise<FixedExpense> {
    return apiRequest<FixedExpense>(`/fixed-expenses/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { isActive },
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/fixed-expenses/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  generate(month: string): Promise<GenerateFixedExpensesResult> {
    return apiRequest<GenerateFixedExpensesResult>("/fixed-expenses/generate", {
      method: "POST",
      auth: true,
      json: { month },
    });
  },
};
