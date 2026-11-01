import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
} from '../constants/employee.constants';

function trimQuery(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class EmployeeQueryDto {
  @Transform(({ value }) => trimQuery(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['all', ...EMPLOYEE_STATUSES])
  status?: 'all' | EmployeeStatus = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
