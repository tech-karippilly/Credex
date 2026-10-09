import { ApplicationStatus } from '../constants/application-status';

export interface ApplicationCandidateResponse {
  name: string;
  email: string;
  phone: string;
  experience: string;
  location: string;
}

export interface ApplicationResumeResponse {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
}

export interface ApplicationAiAnalysisResponse {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  analyzedAt: string;
}

export interface ApplicationCareerSummary {
  id: string;
  title: string;
  isVisible: boolean;
}

export interface ApplicationResponse {
  id: string;
  careerId: string;
  career: ApplicationCareerSummary | null;
  candidate: ApplicationCandidateResponse;
  coverLetter: string | null;
  resume: ApplicationResumeResponse | null;
  status: ApplicationStatus;
  aiAnalysis: ApplicationAiAnalysisResponse | null;
  createdAt: string;
  updatedAt: string;
}
