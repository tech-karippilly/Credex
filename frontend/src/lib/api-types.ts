export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

export interface RefreshResponse extends AuthTokens {}

export interface SiteContactImage {
  url: string;
  publicId: string;
}

export interface SiteContact {
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedinUrl: string;
    instagramUrl: string;
  };
  homepage: {
    mainHeadline: string;
    supportingText: string;
    homepageMainImage: SiteContactImage | null;
    aboutSectionImage: SiteContactImage | null;
  };
}

export interface Service {
  id: string;
  title: string;
  short?: string;
  description: string;
  icon?: string;
  capabilities?: string[];
  benefits?: string[];
  image: SiteContactImage | null;
  order: number;
  isVisible?: boolean;
}

export interface Career {
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
  isVisible: boolean;
}
