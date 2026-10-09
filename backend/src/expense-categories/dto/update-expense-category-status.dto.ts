import { IsBoolean } from 'class-validator';

export class UpdateExpenseCategoryStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
