export interface EnquiryResponse {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  service: string;
  message: string;
  createdAt: string;
}
