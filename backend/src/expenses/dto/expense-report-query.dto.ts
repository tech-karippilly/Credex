import { Transform } from 'class-transformer';
import {
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export const EXPENSE_REPORT_TYPES = [
  'date-wise',
  'month-wise',
  'category-wise',
] as const;

export type ExpenseReportType = (typeof EXPENSE_REPORT_TYPES)[number];

export class ExpenseReportQueryDto {
  @IsString()
  @IsIn([...EXPENSE_REPORT_TYPES])
  type!: ExpenseReportType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  paidBy?: string;
}
