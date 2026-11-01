import { apiRequest } from "./api";
import type { EmployeeStatus } from "./employees-api";

export type SalaryRecord = {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  basePay: number;
  houseRentAllowance: number;
  esi: number;
  pf: number;
  tax: number;
  gross: number;
  deductions: number;
  netPay: number;
  updatedAt: string | null;
};

export type SalaryPayload = {
  basePay: number;
  houseRentAllowance: number;
  esi: number;
  pf: number;
  tax: number;
};

export const salariesApi = {
  list(): Promise<SalaryRecord[]> {
    return apiRequest<SalaryRecord[]>("/salaries", { auth: true });
  },

  update(employeeId: string, payload: SalaryPayload): Promise<SalaryRecord> {
    return apiRequest<SalaryRecord>(`/salaries/${employeeId}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },
};
