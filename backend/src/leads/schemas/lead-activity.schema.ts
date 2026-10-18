import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { LEAD_ACTIVITY_TYPES } from '../constants/lead.constants';
import { Lead } from './lead.schema';

export type LeadActivityDocument = HydratedDocument<LeadActivity>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'lead_activities',
})
export class LeadActivity {
  @Prop({ type: Types.ObjectId, ref: Lead.name, required: true, index: true })
  leadId!: Types.ObjectId;

  @Prop({ required: true, enum: LEAD_ACTIVITY_TYPES })
  type!: string;

  @Prop({ required: true, trim: true })
  actorId!: string;

  @Prop({ required: true, trim: true })
  actorEmail!: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  actorName!: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  summary!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  payload!: Record<string, unknown> | null;

  createdAt?: Date;
}

export const LeadActivitySchema = SchemaFactory.createForClass(LeadActivity);

LeadActivitySchema.index({ leadId: 1, createdAt: -1, _id: -1 });
