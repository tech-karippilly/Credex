import { apiRequest } from "./api";

export interface JobApplicationCareer {
  id: string;
  title: string;
  isVisible: boolean;
}

export interface JobApplicationCandidate {
  name: string;
  email: string;
  phone: string;
  experience: string;
  location: string;
}

export interface JobApplicationResume {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
}

export interface JobApplication {
  id: string;
  careerId: string;
  career: JobApplicationCareer | null;
  candidate: JobApplicationCandidate;
  coverLetter: string | null;
  resume: JobApplicationResume | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateApplicationPayload = {
  careerId: string;
  name: string;
  email: string;
  phone: string;
  experience: string;
  location: string;
  coverLetter?: string;
};

export const applicationsApi = {
  create(payload: CreateApplicationPayload): Promise<JobApplication> {
    return apiRequest<JobApplication>("/applications", {
      method: "POST",
      json: payload,
    });
  },

  uploadResume(id: string, file: File): Promise<JobApplication> {
    const formData = new FormData();
    formData.append("resume", file);
    return apiRequest<JobApplication>(`/applications/${id}/resume`, {
      method: "POST",
      formData,
    });
  },

  list(careerId?: string): Promise<JobApplication[]> {
    const query = careerId ? `?careerId=${encodeURIComponent(careerId)}` : "";
    return apiRequest<JobApplication[]>(`/applications${query}`, { auth: true });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/applications/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
