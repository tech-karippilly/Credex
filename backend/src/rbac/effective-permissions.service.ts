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
    const permissionIds = links.map((link) => link.permissionId);
    if (permissionIds.length === 0) {
      return { superAdmin: false, permissions: new Set() };
    }

    const permissions = await this.permissionModel
      .find({ _id: { $in: permissionIds } })
      .select('key')
      .exec();

    return {
      superAdmin: false,
      permissions: new Set(permissions.map((permission) => permission.key)),
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
