import { apiRequest } from "./api";

export interface ManagedRole {
  id: string;
  name: string;
  key: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roles: ManagedRole[];
  createdAt: string | null;
}

export interface UserPage {
  items: ManagedUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const usersApi = {
  list(query: { search?: string; status?: string; page?: number; limit?: number } = {}): Promise<UserPage> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const suffix = params.size ? `?${params.toString()}` : "";
    return apiRequest<UserPage>(`/users${suffix}`, { auth: true });
  },

  create(payload: { name: string; email: string; password: string }): Promise<ManagedUser> {
    return apiRequest<ManagedUser>("/users", { method: "POST", auth: true, json: payload });
  },

  update(id: string, payload: { name?: string; email?: string; password?: string }): Promise<ManagedUser> {
    return apiRequest<ManagedUser>(`/users/${id}`, { method: "PUT", auth: true, json: payload });
  },

  setStatus(id: string, isActive: boolean): Promise<ManagedUser> {
    return apiRequest<ManagedUser>(`/users/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { isActive },
    });
  },

  remove(id: string): Promise<null> {
    return apiRequest<null>(`/users/${id}`, { method: "DELETE", auth: true });
  },

  assignRole(id: string, roleId: string): Promise<ManagedRole[]> {
    return apiRequest<ManagedRole[]>(`/users/${id}/roles`, {
      method: "POST",
      auth: true,
      json: { roleId },
    });
  },

  removeRole(id: string, roleId: string): Promise<ManagedRole[]> {
    return apiRequest<ManagedRole[]>(`/users/${id}/roles/${roleId}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
