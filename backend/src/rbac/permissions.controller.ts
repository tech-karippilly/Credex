import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesAdminService } from './roles-admin.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rolesAdminService: RolesAdminService) {}

  @Get()
  @RequirePermissions('roles.read')
  async list() {
    return {
      success: true,
      message: 'Permissions fetched successfully',
      data: await this.rolesAdminService.catalogue(),
    };
  }
}
