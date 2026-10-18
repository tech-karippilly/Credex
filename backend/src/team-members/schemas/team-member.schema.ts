import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  TEAM_MEMBER_STATUSES,
  type TeamMemberStatus,
} from '../constants/team-member.constants';

export type TeamMemberDocument = HydratedDocument<TeamMember>;

@Schema({
  timestamps: true,
  collection: 'team_members',
})
export class TeamMember {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, trim: true })
  designation!: string;

  @Prop({ required: true, trim: true })
  department!: string;

  @Prop({ required: true, trim: true })
  positionInCompany!: string;

  @Prop({ trim: true, maxlength: 500, default: '' })
  bio?: string;

  @Prop({
    type: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    default: null,
  })
  photo?: {
    url: string;
    publicId: string;
  } | null;

  @Prop({ required: true, min: 1 })
  order!: number;

  @Prop({
    type: String,
    enum: TEAM_MEMBER_STATUSES,
    default: 'draft',
  })
  status!: TeamMemberStatus;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);

TeamMemberSchema.index({ order: 1 });
TeamMemberSchema.index({ status: 1 });
TeamMemberSchema.index({ status: 1, order: 1 });
