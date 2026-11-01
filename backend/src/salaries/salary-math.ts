import { BadRequestException } from '@nestjs/common';
import type {
  SalaryAmounts,
  SalaryTotals,
} from './interfaces/salary-response.interface';

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function salaryTotals(amounts: SalaryAmounts): SalaryTotals {
  const gross = roundMoney(amounts.basePay + amounts.houseRentAllowance);
  const deductions = roundMoney(amounts.esi + amounts.pf + amounts.tax);
  const netPay = roundMoney(gross - deductions);
  if (netPay < 0) {
    throw new BadRequestException(
      'ESI, PF, and tax cannot be more than base pay plus house rent allowance',
    );
  }
  return { gross, deductions, netPay };
}
