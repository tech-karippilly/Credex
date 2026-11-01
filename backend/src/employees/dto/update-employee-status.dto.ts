import { IsIn } from 'class-validator';
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from '../constants/employee.constants';

export class UpdateEmployeeStatusDto {
  @IsIn(EMPLOYEE_STATUSES)
  status!: EmployeeStatus;
}
