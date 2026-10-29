import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsTwoDecimalAmount } from './is-two-decimal-amount';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function emptyToUndefined(value: unknown): unknown {
  if (value === '' || value === null) return undefined;
  return value;
}

/** Allow clearing receivedDate by sending null. */
function emptyToUndefinedOrNull(value: unknown): unknown {
  if (value === '') return undefined;
  return value;
}

export class UpdateExpenseDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  expenseName?: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paidBy?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @IsTwoDecimalAmount()
  amount?: number;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  invoiceDate?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;

  @Transform(({ value }) => emptyToUndefinedOrNull(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(DATE_ONLY)
  receivedDate?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  notes?: string;
}
