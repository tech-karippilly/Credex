import { apiRequest } from "./api";
import type { Career } from "./api-types";

export type CreateCareerPayload = {
  title: string;
  location: string;
  employmentType: string;
  experience: string;
  workplace: string;
  salary: string;
  responsibilities?: string[];
  requirements?: string[];
  goodToHave?: string[];
  order: number;
  isVisible?: boolean;
};

export type UpdateCareerPayload = Partial<CreateCareerPayload>;

export const careersApi = {
  listAdmin(): Promise<Career[]> {
    return apiRequest<Career[]>("/careers/admin", { auth: true });
  },

  getAdmin(id: string): Promise<Career> {
    return apiRequest<Career>(`/careers/admin/${id}`, { auth: true });
  },

  listPublic(): Promise<Career[]> {
    return apiRequest<Career[]>("/careers");
  },

  create(payload: CreateCareerPayload): Promise<Career> {
    return apiRequest<Career>("/careers", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateCareerPayload): Promise<Career> {
    return apiRequest<Career>(`/careers/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateVisibility(id: string, isVisible: boolean): Promise<Career> {
    return apiRequest<Career>(`/careers/${id}/visibility`, {
      method: "PATCH",
      auth: true,
      json: { isVisible },
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/careers/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
