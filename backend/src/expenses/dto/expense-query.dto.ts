import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const EXPENSE_VOUCHER_STATUS_FILTERS = [
  'NOT_VOUCHERED',
  'VOUCHERED',
] as const;

export class ExpenseQueryDto {
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

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

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  paidBy?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by whether an active voucher is linked via voucher.expenseId. */
  @IsOptional()
  @IsIn(EXPENSE_VOUCHER_STATUS_FILTERS)
  voucherStatus?: (typeof EXPENSE_VOUCHER_STATUS_FILTERS)[number];

  /**
   * When true, only expenses with remaining eligible amount for voucher
   * creation (expense amount not fully covered by active linked vouchers).
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  eligibleForVoucher?: boolean;

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
