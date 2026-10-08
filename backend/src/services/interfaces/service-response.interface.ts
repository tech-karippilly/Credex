export interface ServiceImageResponse {
  url: string;
  publicId: string;
}

export interface ServiceResponse {
  id: string;
  title: string;
  description: string;
  icon?: string;
  image: ServiceImageResponse | null;
  order: number;
}
