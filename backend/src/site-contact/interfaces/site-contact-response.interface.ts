export interface SiteContactImageResponse {
  url: string;
  publicId: string;
}

export interface SiteContactContactResponse {
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  instagramUrl: string;
}

export interface SiteContactHomepageResponse {
  mainHeadline: string;
  supportingText: string;
  homepageMainImage: SiteContactImageResponse | null;
  aboutSectionImage: SiteContactImageResponse | null;
}

export interface SiteContactResponse {
  contact: SiteContactContactResponse;
  homepage: SiteContactHomepageResponse;
}
