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

export class CreateExpenseDto {
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

  /** Preferred field: supplier invoice date (YYYY-MM-DD). */
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  invoiceDate?: string;

  /**
   * Legacy alias for invoiceDate. Required when invoiceDate is omitted so existing
   * clients keep working. Prefer invoiceDate for new callers.
   */
  @Transform(({ value }) => emptyToUndefined(value))
  @ValidateIf((dto: CreateExpenseDto) => !dto.invoiceDate)
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;

  /** Optional date the company received the invoice (YYYY-MM-DD). */
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  receivedDate?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  notes?: string;
}
