import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  DEFAULT_LEAD_PRIORITY,
  DEFAULT_LEAD_STAGE,
  INTEREST_TYPES,
  INTERESTED_MODULES,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from '../constants/lead.constants';

export type LeadDocument = HydratedDocument<Lead>;

@Schema({
  timestamps: true,
  collection: 'leads',
})
export class Lead {
  @Prop({ required: true, trim: true, maxlength: 160 })
  companyName!: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  contactName!: string;

  @Prop({ required: true, trim: true, maxlength: 32 })
  phone!: string;

  @Prop({ required: true, trim: true })
  normalizedPhone!: string;

  @Prop({ type: String, default: null, trim: true, maxlength: 32 })
  alternatePhone!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 255 })
  email!: string | null;

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  normalizedEmail!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 300 })
  website!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 160 })
  location!: string | null;

  @Prop({ required: true, enum: LEAD_SOURCES, index: true })
  source!: string;

  @Prop({
    required: true,
    enum: LEAD_STAGES,
    default: DEFAULT_LEAD_STAGE,
    index: true,
  })
  stage!: string;

  @Prop({
    required: true,
    enum: LEAD_PRIORITIES,
    default: DEFAULT_LEAD_PRIORITY,
    index: true,
  })
  priority!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  assignedUserId!: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true })
  assignedUserName!: string | null;

  @Prop({ type: String, default: null, trim: true, lowercase: true })
  assignedUserEmail!: string | null;

  @Prop({ type: String, enum: INTEREST_TYPES, default: null })
  interestType!: string | null;

  @Prop({ type: [String], enum: INTERESTED_MODULES, default: [] })
  interestedModules!: string[];

  @Prop({ type: String, default: null, trim: true, maxlength: 4000 })
  requestedFeatures!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 4000 })
  changeRequests!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 4000 })
  businessRequirements!: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  estimatedBudget!: number | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 160 })
  expectedTimeline!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 160 })
  decisionMaker!: string | null;

  @Prop({ type: Date, default: null, index: true })
  nextFollowUpAt!: Date | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  nextAction!: string | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 4000 })
  notes!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Enquiry', default: null })
  sourceEnquiryId!: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  createdByUserId!: string;

  @Prop({ required: true, trim: true })
  updatedByUserId!: string;

  @Prop({ type: Date, default: null })
  lastActivityAt!: Date | null;

  @Prop({ type: String, default: null, trim: true, maxlength: 500 })
  lastActivitySummary!: string | null;

  @Prop({ type: String, default: null, trim: true })
  lastActivityType!: string | null;

  @Prop({ type: Date, default: null, index: true })
  deletedAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index({ stage: 1, nextFollowUpAt: 1 });
LeadSchema.index({ assignedUserId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ source: 1, createdAt: -1 });
LeadSchema.index({ createdAt: -1, _id: -1 });
LeadSchema.index({ companyName: 1 });
LeadSchema.index(
  { normalizedPhone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      normalizedPhone: { $type: 'string' },
    },
  },
);
LeadSchema.index(
  { normalizedEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      normalizedEmail: { $type: 'string' },
    },
  },
);
