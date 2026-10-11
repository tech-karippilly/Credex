import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class GrantRolePermissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Matches(/^[a-z0-9_]+\.[a-z0-9_.]+$/)
  permissionKey!: string;
}
