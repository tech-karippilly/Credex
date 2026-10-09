import { apiRequest } from "./api";

export type ExpenseCategoryAdmin = {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateExpenseCategoryPayload = {
  name: string;
  description?: string;
  order?: number;
};

export type UpdateExpenseCategoryPayload = {
  name?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
};

export const expenseCategoriesApi = {
  listAdmin(): Promise<ExpenseCategoryAdmin[]> {
    return apiRequest<ExpenseCategoryAdmin[]>("/expense-categories/admin", {
      auth: true,
    });
  },

  listActive(): Promise<{ id: string; name: string; order: number }[]> {
    return apiRequest<{ id: string; name: string; order: number }[]>(
      "/expense-categories",
      { auth: true },
    );
  },

  create(payload: CreateExpenseCategoryPayload): Promise<ExpenseCategoryAdmin> {
    return apiRequest<ExpenseCategoryAdmin>("/expense-categories", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(
    id: string,
    payload: UpdateExpenseCategoryPayload,
  ): Promise<ExpenseCategoryAdmin> {
    return apiRequest<ExpenseCategoryAdmin>(`/expense-categories/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateStatus(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
    return apiRequest<{ id: string; isActive: boolean }>(
      `/expense-categories/${id}/status`,
      {
        method: "PATCH",
        auth: true,
        json: { isActive },
      },
    );
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/expense-categories/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
