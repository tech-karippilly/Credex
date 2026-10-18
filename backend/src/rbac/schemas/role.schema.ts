import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({
  timestamps: true,
  collection: 'roles',
})
export class Role {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, trim: true })
  key!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ default: false })
  systemManaged!: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
