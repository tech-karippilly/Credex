import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PAYMENT_MODES,
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
} from '../../vouchers/constants/voucher.constants';
import { emptyToUndefined } from '../utils/report-page.util';

export class VoucherReportQueryDto {
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsEnum(VOUCHER_TYPES)
  voucherType?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsEnum(VOUCHER_STATUSES)
  status?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  payee?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsEnum(PAYMENT_MODES)
  paymentMode?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reference?: string;

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
