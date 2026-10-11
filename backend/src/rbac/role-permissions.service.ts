import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import {
  RolePermission,
  RolePermissionDocument,
} from './schemas/role-permission.schema';
import { RolesService } from './roles.service';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectModel(RolePermission.name)
    private readonly rolePermissionModel: Model<RolePermissionDocument>,
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
    private readonly rolesService: RolesService,
  ) {}

  async listKeys(roleId: string): Promise<string[]> {
    const permissionIds = await this.permissionIdsForRole(roleId);
    if (permissionIds.length === 0) {
      return [];
    }

    const permissions = await this.permissionModel
      .find({ _id: { $in: permissionIds } })
      .select('key')
      .exec();

    return permissions.map((permission) => permission.key).sort();
  }

  async assertKeysExist(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    const found = await this.permissionModel
      .find({ key: { $in: keys } })
      .select('key')
      .exec();
    const foundKeys = new Set(found.map((permission) => permission.key));
    const missing = keys.find((key) => !foundKeys.has(key));
    if (missing) {
      throw new BadRequestException(`Unknown permission: ${missing}`);
    }
  }

  async grant(roleId: string, permissionKey: string): Promise<void> {
    if (!isValidObjectId(roleId)) {
      throw new NotFoundException('Role not found');
    }

    const role = await this.rolesService.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permission = await this.permissionModel
      .findOne({ key: permissionKey })
      .exec();
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const existing = await this.rolePermissionModel
      .findOne({ roleId: role._id, permissionId: permission._id })
      .exec();
    if (existing) {
      return;
    }

    try {
      await this.rolePermissionModel.create({
        roleId: role._id,
        permissionId: permission._id,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        return;
      }
      throw error;
    }
  }

  async grantStrict(roleId: string, permissionKey: string): Promise<void> {
    await this.assertKeysExist([permissionKey]);
    const role = await this.requireRole(roleId);
    const permission = await this.permissionModel
      .findOne({ key: permissionKey })
      .exec();
    if (!permission) {
      throw new BadRequestException(`Unknown permission: ${permissionKey}`);
    }

    const existing = await this.rolePermissionModel
      .findOne({ roleId: role._id, permissionId: permission._id })
      .exec();
    if (existing) {
      throw new ConflictException(
        'Permission is already assigned to this role',
      );
    }

    try {
      await this.rolePermissionModel.create({
        roleId: role._id,
        permissionId: permission._id,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Permission is already assigned to this role',
        );
      }
      throw error;
    }
  }

  async replace(
    roleId: string,
    permissionKeys: readonly string[],
  ): Promise<{ added: string[]; removed: string[] }> {
    const unique = [...new Set(permissionKeys)];
    await this.assertKeysExist(unique);
    const current = await this.listKeys(roleId);
    const next = new Set(unique);
    const added = unique.filter((key) => !current.includes(key));
    const removed = current.filter((key) => !next.has(key));
    const granted: string[] = [];

    try {
      for (const key of added) {
        await this.grant(roleId, key);
        granted.push(key);
      }
      for (const key of removed) {
        await this.revoke(roleId, key);
      }
    } catch (error) {
      for (const key of granted) {
        await this.revoke(roleId, key).catch(() => undefined);
      }
      throw error;
    }

    return { added, removed };
  }

  async countByRole(): Promise<Map<string, number>> {
    const rows = await this.rolePermissionModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$roleId', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [String(row._id), row.count]));
  }

  async removeAllForRole(roleId: string): Promise<void> {
    if (!isValidObjectId(roleId)) {
      return;
    }

    await this.rolePermissionModel
      .deleteMany({
        roleId: { $in: [roleId, new Types.ObjectId(roleId)] },
      })
      .exec();
  }

  async revoke(roleId: string, permissionKey: string): Promise<void> {
    if (!isValidObjectId(roleId)) {
      throw new NotFoundException('Role not found');
    }

    const permission = await this.permissionModel
      .findOne({ key: permissionKey })
      .exec();
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    const deleted = await this.rolePermissionModel
      .findOneAndDelete({ roleId, permissionId: permission._id })
      .exec();
    if (!deleted) {
      throw new NotFoundException('Role permission not found');
    }
  }

  private async permissionIdsForRole(roleId: string) {
    if (!isValidObjectId(roleId)) {
      return [];
    }

    const links = await this.rolePermissionModel
      .find({
        roleId: { $in: [roleId, new Types.ObjectId(roleId)] },
      })
      .select('permissionId')
      .exec();
    return links.map((link) => link.permissionId);
  }

  private async requireRole(roleId: string) {
    if (!isValidObjectId(roleId)) {
      throw new NotFoundException('Role not found');
    }

    const role = await this.rolesService.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
