import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_WHEN_PRESENT_KEY,
  PermissionWhenPresent,
} from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../effective-permissions.service';
import { collectRequiredPermissions } from '../permissions/collect-required-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const conditional = this.reflector.getAllAndOverride<
      PermissionWhenPresent[] | undefined
    >(PERMISSIONS_WHEN_PRESENT_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      body?: unknown;
    }>();
    const needed = collectRequiredPermissions(
      required,
      conditional,
      request.body,
    );

    if (needed.length === 0) {
      return true;
    }

    if (!request.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const access = await this.effectivePermissions.resolve(request.user);
    if (access.superAdmin) {
      return true;
    }

    const allowed = needed.every((permission) =>
      access.permissions.has(permission),
    );
    if (!allowed) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}
