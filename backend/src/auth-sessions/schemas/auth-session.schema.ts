import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'auth_sessions',
})
export class AuthSession {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);

AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
