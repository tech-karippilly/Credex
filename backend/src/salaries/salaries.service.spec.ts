import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { SalariesService } from './salaries.service';

const employeeId = new Types.ObjectId();

const employee = {
  _id: employeeId,
  employeeCode: 'NF-0001',
  fullName: 'Ada Lovelace',
  department: 'Support',
  designation: 'Engineer',
  status: 'active',
};

const savedSalary = {
  employeeId,
  basePay: 40000,
  houseRentAllowance: 0,
  esi: 0,
  pf: 0,
  tax: 0,
  updatedAt: new Date('2026-10-31T00:00:00.000Z'),
};

describe('SalariesService', () => {
  function serviceWith(options?: {
    employees?: unknown[];
    salaries?: unknown[];
    employee?: unknown;
    update?: jest.Mock;
  }) {
    const employeeModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(options?.employees ?? [employee]),
          }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          options && 'employee' in options ? options.employee : employee,
        ),
      }),
    };
    const salaryModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(options?.salaries ?? []),
      }),
      findOneAndUpdate:
        options?.update ?? jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(savedSalary),
        }),
    };
    return {
      service: new SalariesService(
        salaryModel as never,
        employeeModel as never,
      ),
      salaryModel,
    };
  }

  it('lists an employee with a zero salary until one is saved', async () => {
    const { service } = serviceWith();

    const rows = await service.list();

    expect(rows).toEqual([
      expect.objectContaining({
        employeeId: employeeId.toString(),
        employeeCode: 'NF-0001',
        fullName: 'Ada Lovelace',
        basePay: 0,
        houseRentAllowance: 0,
        esi: 0,
        pf: 0,
        tax: 0,
        gross: 0,
        deductions: 0,
        netPay: 0,
        updatedAt: null,
      }),
    ]);
  });

  it('saves base pay, ESI, and PF and returns the salary paid', async () => {
    const input: UpdateSalaryDto = {
      basePay: 40000,
      houseRentAllowance: 10000,
      esi: 500,
      pf: 1800,
      tax: 0,
    };
    const { service, salaryModel } = serviceWith({
      update: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...savedSalary,
          ...input,
        }),
      }),
    });

    const saved = await service.update(employeeId.toString(), input);

    expect(salaryModel.findOneAndUpdate).toHaveBeenCalledWith(
      { employeeId },
      {
        $set: {
          basePay: 40000,
          houseRentAllowance: 10000,
          esi: 500,
          pf: 1800,
          tax: 0,
        },
      },
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(saved.gross).toBe(50000);
    expect(saved.deductions).toBe(2300);
    expect(saved.netPay).toBe(47700);
  });

  it('rejects deductions that exceed base pay plus house rent allowance', async () => {
    const { service, salaryModel } = serviceWith();

    await expect(
      service.update(employeeId.toString(), {
        basePay: 1000,
        houseRentAllowance: 0,
        esi: 600,
        pf: 600,
        tax: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(salaryModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an unknown employee', async () => {
    const { service } = serviceWith({ employee: null });

    await expect(
      service.update(employeeId.toString(), {
        basePay: 1000,
        houseRentAllowance: 0,
        esi: 0,
        pf: 0,
        tax: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
