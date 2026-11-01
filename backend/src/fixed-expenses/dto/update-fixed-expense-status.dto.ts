import { IsBoolean } from 'class-validator';

export class UpdateFixedExpenseStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
