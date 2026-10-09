import { apiRequest } from "./api";
import type { Service, SiteContactImage } from "./api-types";

export type CreateServicePayload = {
  title: string;
  description: string;
  icon?: string;
  order: number;
};

export type UpdateServicePayload = Partial<CreateServicePayload>;

export const servicesApi = {
  list(): Promise<Service[]> {
    return apiRequest<Service[]>("/services");
  },

  get(id: string): Promise<Service> {
    return apiRequest<Service>(`/services/${id}`);
  },

  create(payload: CreateServicePayload): Promise<Service> {
    return apiRequest<Service>("/services", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateServicePayload): Promise<Service> {
    return apiRequest<Service>(`/services/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/services/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  uploadImage(id: string, file: File): Promise<Service> {
    const formData = new FormData();
    formData.append("image", file);
    return apiRequest<Service>(`/services/${id}/image`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  deleteImage(id: string): Promise<Service> {
    return apiRequest<Service>(`/services/${id}/image`, {
      method: "DELETE",
      auth: true,
    });
  },
};

export type { SiteContactImage };
