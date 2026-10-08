import { IsBoolean } from 'class-validator';

export class UpdateCareerVisibilityDto {
  @IsBoolean()
  isVisible!: boolean;
}
