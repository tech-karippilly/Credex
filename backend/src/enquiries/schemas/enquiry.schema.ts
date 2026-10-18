import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EnquiryDocument = HydratedDocument<Enquiry>;

@Schema({
  timestamps: true,
  collection: 'enquiries',
})
export class Enquiry {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: null, trim: true })
  company!: string | null;

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ required: true, trim: true })
  service!: string;

  @Prop({ required: true, trim: true })
  message!: string;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);

EnquirySchema.index({ createdAt: -1, _id: -1 });
