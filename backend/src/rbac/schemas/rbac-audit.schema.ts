import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RbacAuditDocument = HydratedDocument<RbacAudit>;

/**
 * Append-only security log for user and role administration.
 * There is no HTTP read API. Records are for operators with database access.
 * Summaries must not contain passwords, tokens, or password hashes.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'rbac_audits',
})
export class RbacAudit {
  @Prop({ required: true, trim: true })
  actorId!: string;

  @Prop({ required: true, trim: true })
  actorEmail!: string;

  @Prop({ required: true, trim: true })
  action!: string;

  @Prop({ required: true, enum: ['user', 'role'] })
  targetType!: 'user' | 'role';

  @Prop({ required: true, trim: true })
  targetId!: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  summary!: string;

  createdAt?: Date;
}

export const RbacAuditSchema = SchemaFactory.createForClass(RbacAudit);

RbacAuditSchema.index({ createdAt: -1 });
RbacAuditSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
