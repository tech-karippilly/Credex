import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PERMISSION_CATALOGUE } from './catalog/permission-catalog';
import { Permission, PermissionDocument } from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission.name)
    private readonly permissionModel: Model<PermissionDocument>,
  ) {}

  async seed(): Promise<void> {
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
}
