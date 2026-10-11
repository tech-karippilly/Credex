import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionDocument = HydratedDocument<Permission>;

@Schema({
  timestamps: true,
  collection: 'permissions',
})
export class Permission {
  @Prop({ required: true, unique: true, trim: true })
  key!: string;

  @Prop({ required: true, trim: true })
  module!: string;

  @Prop({ required: true, trim: true })
  action!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ default: false })
  systemManaged!: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

PermissionSchema.index({ module: 1, action: 1 }, { unique: true });
