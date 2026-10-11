import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALL_PAYMENT_STATUSES } from '../constants/payment.constants';

export class UpdatePaymentStatusDto {
  @IsIn(ALL_PAYMENT_STATUSES)
  status!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
