import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersAdminService } from './users-admin.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersAdminService: UsersAdminService) {}

  @Get()
  @RequirePermissions('users.read')
  async list(@Query() query: UserQueryDto) {
    return {
      success: true,
      message: 'Users fetched successfully',
      data: await this.usersAdminService.list(query),
    };
  }

  @Post()
  @RequirePermissions('users.create')
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() createUserDto: CreateUserDto,
  ) {
    return {
      success: true,
      message: 'User created successfully',
      data: await this.usersAdminService.create(actor, createUserDto),
    };
  }

  @Get(':id/roles')
  @RequirePermissions('users.read')
  async roles(@Param('id') id: string) {
    return {
      success: true,
      message: 'User roles fetched successfully',
      data: await this.usersAdminService.roles(id),
    };
  }

  @Post(':id/roles')
  @RequirePermissions('users.update')
  async assignRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignUserRoleDto,
  ) {
    return {
      success: true,
      message: 'Role assigned successfully',
      data: await this.usersAdminService.assignRole(actor, id, dto),
    };
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('users.update')
  async removeRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return {
      success: true,
      message: 'Role removed successfully',
      data: await this.usersAdminService.removeRole(actor, id, roleId),
    };
  }

  @Get(':id')
  @RequirePermissions('users.read')
  async get(@Param('id') id: string) {
    return {
      success: true,
      message: 'User fetched successfully',
      data: await this.usersAdminService.get(id),
    };
  }

  @Put(':id')
  @RequirePermissions('users.update')
  async update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return {
      success: true,
      message: 'User updated successfully',
      data: await this.usersAdminService.update(actor, id, dto),
    };
  }

  @Patch(':id/status')
  @RequirePermissions('users.status.update')
  async setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return {
      success: true,
      message: 'User status updated successfully',
      data: await this.usersAdminService.setStatus(actor, id, dto),
    };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  async remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.usersAdminService.remove(actor, id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
