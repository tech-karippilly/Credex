export interface CareerPublicResponse {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  experience: string;
  workplace: string;
  salary: string;
  responsibilities: string[];
  requirements: string[];
  goodToHave: string[];
  order: number;
}

export interface CareerAdminResponse extends CareerPublicResponse {
  isVisible: boolean;
}

export interface CareerVisibilityResponse {
  id: string;
  isVisible: boolean;
}
