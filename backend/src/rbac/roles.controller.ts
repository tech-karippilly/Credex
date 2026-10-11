import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { GrantRolePermissionDto } from './dto/grant-role-permission.dto';
import { ReplaceRolePermissionsDto } from './dto/replace-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesAdminService } from './roles-admin.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesAdminService: RolesAdminService) {}

  @Get()
  @RequirePermissions('roles.read')
  async list() {
    return {
      success: true,
      message: 'Roles fetched successfully',
      data: await this.rolesAdminService.list(),
    };
  }

  @Post()
  @RequirePermissions('roles.create')
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return {
      success: true,
      message: 'Role created successfully',
      data: await this.rolesAdminService.create(actor, dto),
    };
  }

  @Get(':id/permissions')
  @RequirePermissions('roles.read')
  async permissions(@Param('id') id: string) {
    return {
      success: true,
      message: 'Role permissions fetched successfully',
      data: await this.rolesAdminService.permissions(id),
    };
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.permissions.update')
  async replacePermissions(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReplaceRolePermissionsDto,
  ) {
    return {
      success: true,
      message: 'Role permissions updated successfully',
      data: await this.rolesAdminService.replace(actor, id, dto.permissionKeys),
    };
  }

  @Post(':id/permissions')
  @RequirePermissions('roles.permissions.update')
  async grant(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: GrantRolePermissionDto,
  ) {
    await this.rolesAdminService.grant(actor, id, dto.permissionKey);
    return {
      success: true,
      message: 'Permission assigned successfully',
    };
  }

  @Delete(':id/permissions/:permissionKey')
  @RequirePermissions('roles.permissions.update')
  async revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('permissionKey') permissionKey: string,
  ) {
    await this.rolesAdminService.revoke(actor, id, permissionKey);
    return {
      success: true,
      message: 'Permission removed successfully',
    };
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  async get(@Param('id') id: string) {
    return {
      success: true,
      message: 'Role fetched successfully',
      data: await this.rolesAdminService.get(id),
    };
  }

  @Put(':id')
  @RequirePermissions('roles.update')
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return {
      success: true,
      message: 'Role updated successfully',
      data: await this.rolesAdminService.update(actor, id, dto),
    };
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.rolesAdminService.remove(actor, id);
    return {
      success: true,
      message: 'Role deleted successfully',
    };
  }
}
