import { ArrayMaxSize, IsArray, IsString, Matches } from 'class-validator';

export class ReplaceRolePermissionsDto {
  @IsArray()
  @ArrayMaxSize(80)
  @IsString({ each: true })
  @Matches(/^[a-z0-9_]+\.[a-z0-9_.]+$/, { each: true })
  permissionKeys!: string[];
}
