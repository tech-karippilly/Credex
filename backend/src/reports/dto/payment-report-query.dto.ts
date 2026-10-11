import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ALL_PAYMENT_STATUSES } from '../../payments/constants/payment.constants';
import { PAYMENT_MODES } from '../../vouchers/constants/voucher.constants';
import { emptyToUndefined } from '../utils/report-page.util';

export class PaymentReportQueryDto {
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
  @IsEnum(PAYMENT_MODES)
  paymentMethod?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsIn(ALL_PAYMENT_STATUSES)
  status?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  payee?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  chequeNumber?: string;

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
