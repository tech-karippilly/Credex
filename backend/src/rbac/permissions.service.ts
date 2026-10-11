import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PERMISSION_CATALOGUE } from './catalog/permission-catalog';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async seed(): Promise<void> {
    await this.dropObsoleteCodeIndex();

    for (const permission of PERMISSION_CATALOGUE) {
      await this.permissionModel
        .updateOne(
          { key: permission.key },
          {
            $setOnInsert: {
              key: permission.key,
              module: permission.module,
              action: permission.action,
              description: permission.description,
              systemManaged: true,
            },
          },
          { upsert: true },
        )
        .exec();
    }
  }

  async count(): Promise<number> {
    return this.permissionModel.countDocuments().exec();
  }

  async list() {
    return this.permissionModel
      .find()
      .select('key module action description systemManaged')
      .sort({ module: 1, action: 1 })
      .exec();
  }

  async listKeys(): Promise<string[]> {
    const permissions = await this.permissionModel
      .find()
      .select('key')
      .sort({ key: 1 })
      .exec();
    return permissions.map((permission) => permission.key);
  }

  /**
   * Older databases kept a unique index on `code`. Current rows identify a
   * permission by `key` and leave `code` unset, so MongoDB indexes every
   * missing value as null and the second insert fails with E11000.
   */
  private async dropObsoleteCodeIndex(): Promise<void> {
    try {
      const indexes = await this.permissionModel.collection.indexes();
      if (!indexes.some((index) => index.name === 'code_1')) {
        return;
      }

      await this.permissionModel.collection.dropIndex('code_1');
      this.logger.warn('Dropped obsolete unique index code_1 on permissions');
    } catch (error) {
      if (this.isIgnorableIndexError(error)) {
        return;
      }
      throw error;
    }
  }

  private isIgnorableIndexError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    const code = (error as { code: number }).code;
    // 26 NamespaceNotFound (collection not created yet), 27 IndexNotFound
    return code === 26 || code === 27;
  }
}
