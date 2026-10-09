export interface ExpenseCategoryAdminResponse {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategoryActiveResponse {
  id: string;
  name: string;
  order: number;
}
