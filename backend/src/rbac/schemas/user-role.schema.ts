import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Role } from './role.schema';
import { User } from '../../users/schemas/user.schema';

export type UserRoleDocument = HydratedDocument<UserRole>;

@Schema({
  timestamps: true,
  collection: 'user_roles',
})
export class UserRole {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Role.name, required: true })
  roleId!: Types.ObjectId;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);

UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
