export interface ServiceImageResponse {
  url: string;
  publicId: string;
}

export interface ServiceResponse {
  id: string;
  title: string;
  short: string;
  description: string;
  icon?: string;
  capabilities: string[];
  benefits: string[];
  image: ServiceImageResponse | null;
  order: number;
  isVisible: boolean;
}
