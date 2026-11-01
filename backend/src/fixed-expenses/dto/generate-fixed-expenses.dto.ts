import { Matches } from 'class-validator';

export class GenerateFixedExpensesDto {
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;
}
