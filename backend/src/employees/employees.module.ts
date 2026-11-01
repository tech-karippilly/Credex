import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RbacModule } from '../rbac/rbac.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import {
  EmployeeCounter,
  EmployeeCounterSchema,
} from './schemas/employee-counter.schema';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import {
  EmployeeDepartment,
  EmployeeDepartmentSchema,
} from './schemas/employee-department.schema';
import {
  EmployeeDesignation,
  EmployeeDesignationSchema,
} from './schemas/employee-designation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeDesignation.name, schema: EmployeeDesignationSchema },
      { name: EmployeeDepartment.name, schema: EmployeeDepartmentSchema },
      { name: EmployeeCounter.name, schema: EmployeeCounterSchema },
    ]),
    AuthModule,
    RbacModule,
    CloudinaryModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
