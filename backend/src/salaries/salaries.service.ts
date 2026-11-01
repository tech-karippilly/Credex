import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import type { EmployeeStatus } from '../employees/constants/employee.constants';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { SalaryRecord } from './interfaces/salary-response.interface';
import { salaryTotals } from './salary-math';
import {
  EmployeeSalary,
  EmployeeSalaryDocument,
} from './schemas/employee-salary.schema';

@Injectable()
export class SalariesService {
  constructor(
    @InjectModel(EmployeeSalary.name)
    private readonly salaryModel: Model<EmployeeSalaryDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  async list(): Promise<SalaryRecord[]> {
    const employees = await this.employeeModel
      .find()
      .select('employeeCode fullName department designation status')
      .sort({ fullName: 1 })
      .exec();
    const salaries = await this.salaryModel
      .find({
        employeeId: { $in: employees.map((employee) => employee._id) },
      })
      .exec();
    const byEmployee = new Map(
      salaries.map((salary) => [salary.employeeId.toString(), salary]),
    );
    return employees.map((employee) =>
      this.toRecord(employee, byEmployee.get(employee._id.toString())),
    );
  }

  async update(employeeId: string, dto: UpdateSalaryDto): Promise<SalaryRecord> {
    const employee = await this.findEmployee(employeeId);
    const totals = salaryTotals(dto);
    const saved = await this.salaryModel
      .findOneAndUpdate(
        { employeeId: employee._id },
        {
          $set: {
            basePay: dto.basePay,
            houseRentAllowance: dto.houseRentAllowance,
            esi: dto.esi,
            pf: dto.pf,
            tax: dto.tax,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.toRecord(employee, saved ?? undefined, totals);
  }

  private async findEmployee(id: string): Promise<EmployeeDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Employee not found');
    }
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private toRecord(
    employee: EmployeeDocument,
    salary?: EmployeeSalaryDocument,
    totals = salaryTotals({
      basePay: salary?.basePay ?? 0,
      houseRentAllowance: salary?.houseRentAllowance ?? 0,
      esi: salary?.esi ?? 0,
      pf: salary?.pf ?? 0,
      tax: salary?.tax ?? 0,
    }),
  ): SalaryRecord {
    return {
      employeeId: employee._id.toString(),
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      department: employee.department,
      designation: employee.designation,
      status: employee.status as EmployeeStatus,
      basePay: salary?.basePay ?? 0,
      houseRentAllowance: salary?.houseRentAllowance ?? 0,
      esi: salary?.esi ?? 0,
      pf: salary?.pf ?? 0,
      tax: salary?.tax ?? 0,
      ...totals,
      updatedAt: salary?.updatedAt?.toISOString() ?? null,
    };
  }
}
