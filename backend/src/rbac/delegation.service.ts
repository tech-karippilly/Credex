import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  CANNOT_CHANGE_OWN_ROLES_MESSAGE,
  CANNOT_DELEGATE_MESSAGE,
  isSelfRoleChange,
  permissionsOutsideGrant,
} from './delegation/delegation-policy';
import { EffectivePermissionsService } from './effective-permissions.service';
import { RolePermissionsService } from './role-permissions.service';

@Injectable()
export class DelegationService {
  constructor(
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly rolePermissions: RolePermissionsService,
  ) {}

  async assertCanGrant(
    actor: AuthenticatedUser,
    permissionKeys: readonly string[],
  ): Promise<void> {
    if (permissionKeys.length === 0) {
      return;
    }

    const access = await this.effectivePermissions.resolve(actor);
    const outside = permissionsOutsideGrant(
      access.permissions,
      permissionKeys,
      access.superAdmin,
    );
    if (outside.length > 0) {
      throw new ForbiddenException(CANNOT_DELEGATE_MESSAGE);
    }
  }

  async assertCanChangeUserRoles(
    actor: AuthenticatedUser,
    targetUserId: string,
    roleId: string,
  ): Promise<void> {
    const access = await this.effectivePermissions.resolve(actor);
    if (isSelfRoleChange(actor.userId, targetUserId, access.superAdmin)) {
      throw new ForbiddenException(CANNOT_CHANGE_OWN_ROLES_MESSAGE);
    }

    const keys = await this.rolePermissions.listKeys(roleId);
    const outside = permissionsOutsideGrant(
      access.permissions,
      keys,
      access.superAdmin,
    );
    if (outside.length > 0) {
      throw new ForbiddenException(CANNOT_DELEGATE_MESSAGE);
    }
  }
}
