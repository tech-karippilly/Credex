import type { EmployeeStatus } from '../../employees/constants/employee.constants';

export interface SalaryAmounts {
  basePay: number;
  houseRentAllowance: number;
  esi: number;
  pf: number;
  tax: number;
}

export interface SalaryTotals {
  gross: number;
  deductions: number;
  netPay: number;
}

export interface SalaryRecord extends SalaryAmounts, SalaryTotals {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  updatedAt: string | null;
}
