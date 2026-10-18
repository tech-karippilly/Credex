import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { ADMIN_SUBJECT } from '../auth/constants/auth.constants';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UsersService } from '../users/users.service';
import {
  isUserActive,
  isUserSuperAdmin,
} from '../users/utils/user-account.util';
import { mapLegacyPermissionCodes } from './catalog/legacy-permission-map';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import {
  RolePermission,
  RolePermissionDocument,
} from './schemas/role-permission.schema';
import { UserRole, UserRoleDocument } from './schemas/user-role.schema';

export interface EffectiveAccess {
  superAdmin: boolean;
  permissions: ReadonlySet<string>;
}

@Injectable()
export class EffectivePermissionsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectModel(UserRole.name)
    private readonly userRoleModel: Model<UserRoleDocument>,
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
    @InjectModel(RolePermission.name)
    private readonly rolePermissionModel: Model<RolePermissionDocument>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async resolve(user: AuthenticatedUser): Promise<EffectiveAccess> {
    if (this.isLegacySuperAdmin(user)) {
      return { superAdmin: true, permissions: new Set() };
    }

    if (!isValidObjectId(user.userId)) {
      return { superAdmin: false, permissions: new Set() };
    }

    const account = await this.usersService.findById(user.userId);
    if (!account || !isUserActive(account)) {
      return { superAdmin: false, permissions: new Set() };
    }

    if (isUserSuperAdmin(account)) {
      return { superAdmin: true, permissions: new Set() };
    }

    const assignments = await this.userRoleModel
      .find({ userId: { $in: this.idVariants(account._id) } })
      .exec();
    const assignedRoleIds = assignments.flatMap((assignment) =>
      this.idVariants(assignment.roleId),
    );
    if (assignedRoleIds.length === 0) {
      return { superAdmin: false, permissions: new Set() };
    }

    const roles = await this.roleModel
      .find({ _id: { $in: assignedRoleIds } })
      .select('_id')
      .exec();
    const roleIds = roles.map((role) => role._id);
    if (roleIds.length === 0) {
      return { superAdmin: false, permissions: new Set() };
    }

    const links = await this.rolePermissionModel
      .find({
        roleId: { $in: roleIds.flatMap((roleId) => this.idVariants(roleId)) },
      })
      .exec();
    const linkedPermissionIds = new Map<
      string,
      Array<Types.ObjectId | string>
    >();
    for (const link of links) {
      const roleId = String(link.roleId);
      const current = linkedPermissionIds.get(roleId) ?? [];
      current.push(link.permissionId);
      linkedPermissionIds.set(roleId, current);
    }

    const permissionIds = [...linkedPermissionIds.values()].flat();
    const permissions =
      permissionIds.length === 0
        ? []
        : await this.permissionModel
            .find({ _id: { $in: permissionIds } })
            .select('key')
            .exec();
    const keyByPermissionId = new Map(
      permissions
        .filter((permission) => Boolean(permission.key))
        .map((permission) => [String(permission._id), permission.key]),
    );

    const keys = new Set<string>();
    const rolesWithoutLinks: Types.ObjectId[] = [];
    for (const roleId of roleIds) {
      const linked = linkedPermissionIds.get(String(roleId));
      if (!linked || linked.length === 0) {
        rolesWithoutLinks.push(roleId);
        continue;
      }

      for (const permissionId of linked) {
        const key = keyByPermissionId.get(String(permissionId));
        if (key) {
          keys.add(key);
        }
      }
    }

    if (rolesWithoutLinks.length > 0) {
      const legacyRoles = await this.roleModel.collection
        .find({ _id: { $in: rolesWithoutLinks } })
        .project({ permissions: 1 })
        .toArray();
      for (const role of legacyRoles) {
        const codes = Array.isArray(role.permissions)
          ? role.permissions.filter(
              (code): code is string => typeof code === 'string',
            )
          : [];
        for (const key of mapLegacyPermissionCodes(codes)) {
          keys.add(key);
        }
      }
    }

    return {
      superAdmin: false,
      permissions: keys,
    };
  }

  private idVariants(id: unknown): Array<Types.ObjectId | string> {
    const text = String(id);
    if (!isValidObjectId(text)) {
      return [text];
    }

    return [text, new Types.ObjectId(text)];
  }

  private isLegacySuperAdmin(user: AuthenticatedUser): boolean {
    const adminEmail = this.configService
      .getOrThrow<string>('admin.email')
      .toLowerCase();

    return (
      user.userId === ADMIN_SUBJECT && user.email.toLowerCase() === adminEmail
    );
  }
}
