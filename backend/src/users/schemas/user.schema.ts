import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isSuperAdmin!: boolean;

  @Prop({ default: 0 })
  authVersion!: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { isSuperAdmin: 1 },
  {
    unique: true,
    partialFilterExpression: { isSuperAdmin: true },
  },
);
