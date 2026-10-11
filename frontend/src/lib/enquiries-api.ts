import { apiRequest } from "./api";

export interface Enquiry {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  service: string;
  message: string;
  created_at: string;
}

export const enquiriesApi = {
  list(): Promise<Enquiry[]> {
    return apiRequest<Enquiry[]>("/enquiries", { auth: true });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/enquiries/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
