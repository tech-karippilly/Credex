import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PermissionsService } from './permissions.service';

@Controller('auth')
export class AccessController {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get('access')
  @UseGuards(JwtAuthGuard)
  async access(@CurrentUser() user: AuthenticatedUser) {
    const resolved = await this.effectivePermissions.resolve(user);
    const permissions = resolved.superAdmin
      ? await this.permissionsService.listKeys()
      : [...resolved.permissions].sort();

    return {
      success: true,
      message: 'Access fetched successfully',
      data: {
        superAdmin: resolved.superAdmin,
        permissions,
      },
    };
  }
}
