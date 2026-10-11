import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { DelegationService } from './delegation.service';
import { PermissionsService } from './permissions.service';
import { RbacAuditService } from './rbac-audit.service';
import { RolePermissionsService } from './role-permissions.service';
import { RolesService } from './roles.service';
import { RoleDocument } from './schemas/role.schema';
import { UserRolesService } from './user-roles.service';
import { roleKeyFromName } from './utils/role-key';

const SYSTEM_ROLE_MESSAGE = 'System-managed roles cannot be modified';

export interface RoleSummary {
  id: string;
  name: string;
  key: string;
  description: string;
  systemManaged: boolean;
  userCount: number;
  permissionCount: number;
}

export interface PermissionView {
  key: string;
  module: string;
  action: string;
  description: string;
  systemManaged: boolean;
}

@Injectable()
export class RolesAdminService {
  constructor(
    private readonly rolesService: RolesService,
    private readonly rolePermissions: RolePermissionsService,
    private readonly userRoles: UserRolesService,
    private readonly permissionsService: PermissionsService,
    private readonly delegation: DelegationService,
    private readonly audit: RbacAuditService,
  ) {}

  async list(): Promise<RoleSummary[]> {
    const [roles, userCounts, permissionCounts] = await Promise.all([
      this.rolesService.list(),
      this.userRoles.countUsersByRole(),
      this.rolePermissions.countByRole(),
    ]);

    return roles.map((role) =>
      this.toSummary(
        role,
        userCounts.get(role._id.toString()) ?? 0,
        permissionCounts.get(role._id.toString()) ?? 0,
      ),
    );
  }

  async get(id: string) {
    const role = await this.requireRole(id);
    const permissions = await this.permissionsForRole(role._id.toString());
    const userCounts = await this.userRoles.countUsersByRole();

    return {
      ...this.toSummary(
        role,
        userCounts.get(role._id.toString()) ?? 0,
        permissions.length,
      ),
      permissions,
    };
  }

  async catalogue(): Promise<PermissionView[]> {
    const permissions = await this.permissionsService.list();
    return permissions.map((permission) => ({
      key: permission.key,
      module: permission.module,
      action: permission.action,
      description: permission.description,
      systemManaged: permission.systemManaged !== false,
    }));
  }

  async create(actor: AuthenticatedUser, input: { name: string; description: string }) {
    const role = await this.rolesService.create({
      name: input.name,
      description: input.description,
      key: roleKeyFromName(input.name),
      systemManaged: false,
    });

    await this.audit.record({
      actor,
      action: 'role.created',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Created role ${role.key}`,
    });

    return this.toSummary(role, 0, 0);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: { name: string; description: string },
  ) {
    const existing = await this.requireRole(id);
    this.assertCustomRole(existing);
    const role = await this.rolesService.update(id, input);

    await this.audit.record({
      actor,
      action: 'role.updated',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Updated role ${role.key}`,
    });

    return this.get(role._id.toString());
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const role = await this.requireRole(id);
    this.assertCustomRole(role);
    const userCounts = await this.userRoles.countUsersByRole();
    if ((userCounts.get(role._id.toString()) ?? 0) > 0) {
      throw new ConflictException(
        'Role is assigned to users. Remove those assignments before deleting it',
      );
    }

    await this.rolePermissions.removeAllForRole(role._id.toString());
    await this.userRoles.removeAllForRole(role._id.toString());
    await this.rolesService.deleteById(role._id.toString());

    await this.audit.record({
      actor,
      action: 'role.deleted',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Deleted role ${role.key}`,
    });
  }

  async permissions(id: string): Promise<PermissionView[]> {
    const role = await this.requireRole(id);
    return this.permissionsForRole(role._id.toString());
  }

  async grant(
    actor: AuthenticatedUser,
    id: string,
    permissionKey: string,
  ): Promise<void> {
    const role = await this.requireRole(id);
    this.assertCustomRole(role);
    await this.rolePermissions.assertKeysExist([permissionKey]);
    await this.delegation.assertCanGrant(actor, [permissionKey]);
    await this.rolePermissions.grantStrict(id, permissionKey);

    await this.audit.record({
      actor,
      action: 'role.permission.added',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Added ${permissionKey} to role ${role.key}`,
    });
  }

  async revoke(
    actor: AuthenticatedUser,
    id: string,
    permissionKey: string,
  ): Promise<void> {
    const role = await this.requireRole(id);
    this.assertCustomRole(role);
    await this.rolePermissions.assertKeysExist([permissionKey]);
    await this.delegation.assertCanGrant(actor, [permissionKey]);
    await this.rolePermissions.revoke(id, permissionKey);

    await this.audit.record({
      actor,
      action: 'role.permission.removed',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Removed ${permissionKey} from role ${role.key}`,
    });
  }

  async replace(
    actor: AuthenticatedUser,
    id: string,
    permissionKeys: string[],
  ) {
    const role = await this.requireRole(id);
    this.assertCustomRole(role);
    const unique = [...new Set(permissionKeys)];
    await this.rolePermissions.assertKeysExist(unique);
    const current = await this.rolePermissions.listKeys(id);
    const next = new Set(unique);
    const changed = [
      ...unique.filter((key) => !current.includes(key)),
      ...current.filter((key) => !next.has(key)),
    ];
    await this.delegation.assertCanGrant(actor, changed);
    const result = await this.rolePermissions.replace(id, unique);

    await this.audit.record({
      actor,
      action: 'role.permissions.updated',
      targetType: 'role',
      targetId: role._id.toString(),
      summary: `Updated permissions on role ${role.key}: added ${result.added.join(', ') || 'none'}; removed ${result.removed.join(', ') || 'none'}`,
    });

    return this.permissions(id);
  }

  private async permissionsForRole(roleId: string): Promise<PermissionView[]> {
    const keys = new Set(await this.rolePermissions.listKeys(roleId));
    const catalogue = await this.catalogue();
    return catalogue.filter((permission) => keys.has(permission.key));
  }

  private async requireRole(id: string): Promise<RoleDocument> {
    const role = await this.rolesService.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private assertCustomRole(role: RoleDocument): void {
    if (role.systemManaged) {
      throw new ForbiddenException(SYSTEM_ROLE_MESSAGE);
    }
  }

  private toSummary(
    role: RoleDocument,
    userCount: number,
    permissionCount: number,
  ): RoleSummary {
    return {
      id: role._id.toString(),
      name: role.name,
      key: role.key,
      description: role.description,
      systemManaged: role.systemManaged === true,
      userCount,
      permissionCount,
    };
  }
}
