import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import {
  PAYMENT_MODES,
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
} from '../constants/voucher.constants';

export class CreateVoucherDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  voucherDate!: string;

  @IsEnum(VOUCHER_TYPES)
  voucherType!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  description?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  paidBy!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  payee!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsEnum(PAYMENT_MODES)
  paymentMode!: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  expenseId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(VOUCHER_STATUSES)
  status?: string;
}
