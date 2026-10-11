import { IsMongoId } from 'class-validator';

export class AssignUserRoleDto {
  @IsMongoId()
  roleId!: string;
}
