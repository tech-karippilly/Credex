import { Transform } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IsTwoDecimalAmount } from '../../expenses/dto/is-two-decimal-amount';

export class CreateFixedExpenseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  expenseName!: string;

  @IsMongoId()
  categoryId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  paidBy!: string;

  @IsNumber()
  @Min(0.01)
  @IsTwoDecimalAmount()
  amount!: number;

  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  notes?: string;
}
