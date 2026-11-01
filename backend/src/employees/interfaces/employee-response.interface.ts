import type {
  EmployeeStatus,
  EmploymentType,
} from '../constants/employee.constants';

export interface EmployeeManagerResponse {
  id: string;
  employeeCode: string;
  fullName: string;
}

export interface EmployeeFileResponse {
  url: string;
  fileName: string;
  mimeType: string;
}

export interface EmployeeListItem {
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
  reportingManager: EmployeeManagerResponse | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  dateOfBirth: string | null;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankName: string;
  ifsc: string;
  bankAccountName: string;
  bankAccountNumber: string;
  photo: EmployeeFileResponse | null;
  idProof: EmployeeFileResponse | null;
  pan: EmployeeFileResponse | null;
  bankProof: EmployeeFileResponse | null;
  offerLetter: EmployeeFileResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResult {
  items: EmployeeListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmployeeSummary {
  onboarding: number;
  active: number;
  exited: number;
  total: number;
}

export interface EmployeeOption {
  id: string;
  employeeCode: string;
  fullName: string;
  status: EmployeeStatus;
}
