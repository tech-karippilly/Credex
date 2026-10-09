import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApplicationStatus } from '../constants/application-status';

export type ApplicationDocument = HydratedDocument<Application>;

@Schema({ _id: false })
export class ApplicationCandidate {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  experience!: string;

  @Prop({ required: true, trim: true })
  location!: string;
}

@Schema({ _id: false })
export class ApplicationResume {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  publicId!: string;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;
}

@Schema({ _id: false })
export class ApplicationAiAnalysis {
  @Prop({ required: true, min: 0, max: 100 })
  score!: number;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: [String], default: [] })
  strengths!: string[];

  @Prop({ type: [String], default: [] })
  gaps!: string[];

  @Prop({ required: true })
  recommendation!: string;

  @Prop({ required: true })
  analyzedAt!: Date;
}

const ApplicationCandidateSchema =
  SchemaFactory.createForClass(ApplicationCandidate);
const ApplicationResumeSchema = SchemaFactory.createForClass(ApplicationResume);
const ApplicationAiAnalysisSchema = SchemaFactory.createForClass(
  ApplicationAiAnalysis,
);

@Schema({
  timestamps: true,
  collection: 'applications',
})
export class Application {
  @Prop({
    type: Types.ObjectId,
    ref: 'Career',
    required: true,
    index: true,
  })
  careerId!: Types.ObjectId;

  @Prop({ type: ApplicationCandidateSchema, required: true })
  candidate!: ApplicationCandidate;

  @Prop({ type: ApplicationResumeSchema, default: null })
  resume!: ApplicationResume | null;

  @Prop({ type: String, default: null })
  coverLetter!: string | null;

  @Prop({
    type: String,
    enum: ApplicationStatus,
    default: ApplicationStatus.NEW,
    index: true,
  })
  status!: ApplicationStatus;

  @Prop({ type: ApplicationAiAnalysisSchema, default: null })
  aiAnalysis!: ApplicationAiAnalysis | null;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

ApplicationSchema.index({ careerId: 1, createdAt: -1 });
ApplicationSchema.index({ careerId: 1, 'aiAnalysis.score': -1, createdAt: -1 });
