import { apiRequest } from "./api";

export interface PermissionRecord {
  key: string;
  module: string;
  action: string;
  description: string;
  systemManaged: boolean;
}

export interface ManagedRoleDetail {
  id: string;
  name: string;
  key: string;
  description: string;
  systemManaged: boolean;
  userCount: number;
  permissionCount: number;
  permissions?: PermissionRecord[];
}

export const rolesApi = {
  list(): Promise<ManagedRoleDetail[]> {
    return apiRequest<ManagedRoleDetail[]>("/roles", { auth: true });
  },

  get(id: string): Promise<ManagedRoleDetail> {
    return apiRequest<ManagedRoleDetail>(`/roles/${id}`, { auth: true });
  },

  create(payload: { name: string; description: string }): Promise<ManagedRoleDetail> {
    return apiRequest<ManagedRoleDetail>("/roles", { method: "POST", auth: true, json: payload });
  },

  update(id: string, payload: { name: string; description: string }): Promise<ManagedRoleDetail> {
    return apiRequest<ManagedRoleDetail>(`/roles/${id}`, { method: "PUT", auth: true, json: payload });
  },

  remove(id: string): Promise<null> {
    return apiRequest<null>(`/roles/${id}`, { method: "DELETE", auth: true });
  },

  catalogue(): Promise<PermissionRecord[]> {
    return apiRequest<PermissionRecord[]>("/permissions", { auth: true });
  },

  replacePermissions(id: string, permissionKeys: string[]): Promise<PermissionRecord[]> {
    return apiRequest<PermissionRecord[]>(`/roles/${id}/permissions`, {
      method: "PUT",
      auth: true,
      json: { permissionKeys },
    });
  },
};
