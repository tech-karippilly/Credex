import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Permission } from './permission.schema';
import { Role } from './role.schema';

export type RolePermissionDocument = HydratedDocument<RolePermission>;

@Schema({
  timestamps: true,
  collection: 'role_permissions',
})
export class RolePermission {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Role.name,
    required: true,
  })
  roleId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Permission.name,
    required: true,
  })
  permissionId!: Types.ObjectId;
}

export const RolePermissionSchema =
  SchemaFactory.createForClass(RolePermission);

RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
