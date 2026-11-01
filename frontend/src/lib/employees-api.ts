import { apiRequest } from "./api";

export type EmployeeStatus = "onboarding" | "active" | "exited";
export type EmploymentType = "full_time" | "contract";
export type EmployeeDocumentKind = "photo" | "id-proof" | "pan" | "bank-proof" | "offer-letter";

export type EmployeeManager = {
  id: string;
  employeeCode: string;
  fullName: string;
};

export type EmployeeFile = {
  url: string;
  fileName: string;
  mimeType: string;
};

export type EmployeeListItem = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  workLocation: string;
  employmentType: EmploymentType;
  joiningDate: string;
  status: EmployeeStatus;
  deviceUserId: string | null;
  reportingManager: EmployeeManager | null;
};

export type EmployeeDetail = EmployeeListItem & {
  dateOfBirth: string | null;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankName: string;
  ifsc: string;
  bankAccountName: string;
  bankAccountNumber: string;
  photo: EmployeeFile | null;
  idProof: EmployeeFile | null;
  pan: EmployeeFile | null;
  bankProof: EmployeeFile | null;
  offerLetter: EmployeeFile | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeListResult = {
  items: EmployeeListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type EmployeeSummary = {
  onboarding: number;
  active: number;
  exited: number;
  total: number;
};

export type EmployeeOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  status: EmployeeStatus;
};

export type EmployeeDesignation = {
  id: string;
  name: string;
};

export type EmployeeDepartmentOption = {
  id: string;
  name: string;
};

export type EmployeeJobSetup = {
  departments: EmployeeDepartmentOption[];
  designations: EmployeeDesignation[];
};

export type EmployeeListQuery = {
  search?: string;
  status?: "all" | EmployeeStatus;
  page?: number;
  limit?: number;
};

export type EmployeePayload = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string | null;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  department: string;
  designation: string;
  workLocation: string;
  employmentType: EmploymentType;
  joiningDate: string;
  reportingManagerId?: string | null;
  deviceUserId?: string | null;
  bankName?: string;
  ifsc?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
};

function listQuery(query: EmployeeListQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status && query.status !== "all") params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));
  return params.toString();
}

export const employeesApi = {
  summary(): Promise<EmployeeSummary> {
    return apiRequest<EmployeeSummary>("/employees/summary", { auth: true });
  },

  options(): Promise<EmployeeOption[]> {
    return apiRequest<EmployeeOption[]>("/employees/options", { auth: true });
  },

  setup(): Promise<EmployeeJobSetup> {
    return apiRequest<EmployeeJobSetup>("/employees/setup", { auth: true });
  },

  createDepartment(name: string): Promise<EmployeeDepartmentOption> {
    return apiRequest<EmployeeDepartmentOption>("/employees/departments", {
      method: "POST",
      auth: true,
      json: { name },
    });
  },

  updateDepartment(id: string, name: string): Promise<EmployeeDepartmentOption> {
    return apiRequest<EmployeeDepartmentOption>(`/employees/departments/${id}`, {
      method: "PUT",
      auth: true,
      json: { name },
    });
  },

  deleteDepartment(id: string): Promise<void> {
    return apiRequest<void>(`/employees/departments/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  createDesignation(name: string): Promise<EmployeeDesignation> {
    return apiRequest<EmployeeDesignation>("/employees/designations", {
      method: "POST",
      auth: true,
      json: { name },
    });
  },

  deleteDesignation(id: string): Promise<void> {
    return apiRequest<void>(`/employees/designations/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  list(query: EmployeeListQuery = {}): Promise<EmployeeListResult> {
    return apiRequest<EmployeeListResult>(`/employees?${listQuery(query)}`, { auth: true });
  },

  get(id: string): Promise<EmployeeDetail> {
    return apiRequest<EmployeeDetail>(`/employees/${id}`, { auth: true });
  },

  create(payload: EmployeePayload): Promise<EmployeeDetail> {
    return apiRequest<EmployeeDetail>("/employees", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: EmployeePayload): Promise<EmployeeDetail> {
    return apiRequest<EmployeeDetail>(`/employees/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateStatus(id: string, status: EmployeeStatus): Promise<EmployeeDetail> {
    return apiRequest<EmployeeDetail>(`/employees/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { status },
    });
  },

  uploadDocument(id: string, kind: EmployeeDocumentKind, file: File): Promise<EmployeeDetail> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<EmployeeDetail>(`/employees/${id}/documents/${kind}`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  deleteDocument(id: string, kind: EmployeeDocumentKind): Promise<EmployeeDetail> {
    return apiRequest<EmployeeDetail>(`/employees/${id}/documents/${kind}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
