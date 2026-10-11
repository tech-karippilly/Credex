import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PAYMENT_MODES } from '../../vouchers/constants/voucher.constants';
import { IsTwoDecimalAmount } from '../../expenses/dto/is-two-decimal-amount';
import {
  ALL_PAYMENT_STATUSES,
  TRANSFER_METHODS,
} from '../constants/payment.constants';
import { AllocationInputDto } from './allocation-input.dto';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';

export class CreatePaymentDto {
  @IsEnum(PAYMENT_MODES)
  paymentMethod!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  paymentDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsTwoDecimalAmount()
  amount!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  payee!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceAccount?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  chequeNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  chequeDate?: string;

  @IsOptional()
  @IsIn(TRANSFER_METHODS)
  transferMethod?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @IsOptional()
  @IsIn(ALL_PAYMENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations?: AllocationInputDto[];
}
