import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { RbacModule } from '../rbac/rbac.module';
import { SalariesController } from './salaries.controller';
import { SalariesService } from './salaries.service';
import {
  EmployeeSalary,
  EmployeeSalarySchema,
} from './schemas/employee-salary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmployeeSalary.name, schema: EmployeeSalarySchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    AuthModule,
    RbacModule,
  ],
  controllers: [SalariesController],
  providers: [SalariesService],
})
export class SalariesModule {}
