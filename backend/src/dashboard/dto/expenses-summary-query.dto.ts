import { IsOptional, IsString, Matches } from 'class-validator';

export class ExpensesSummaryQueryDto {
  /**
   * Calendar month in YYYY-MM (UTC invoice-date basis).
   * Defaults to the current UTC month when omitted.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}
