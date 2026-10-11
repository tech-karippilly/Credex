import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  description!: string;
}
