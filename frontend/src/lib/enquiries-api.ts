import { apiRequest } from "./api";

export interface Enquiry {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  service: string;
  message: string;
  createdAt: string;
}

export interface CreateEnquiryInput {
  name: string;
  company?: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

export const enquiriesApi = {
  create(input: CreateEnquiryInput): Promise<Enquiry> {
    return apiRequest<Enquiry>("/enquiries", { method: "POST", json: input });
  },

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
