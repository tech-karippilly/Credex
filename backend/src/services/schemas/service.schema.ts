import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service>;

@Schema({
  timestamps: true,
  collection: 'services',
})
export class Service {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ required: false, trim: true, default: '' })
  short?: string;

  @Prop({ required: false, trim: true })
  icon?: string;

  @Prop({ type: [String], default: [] })
  capabilities!: string[];

  @Prop({ type: [String], default: [] })
  benefits!: string[];

  @Prop({
    type: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    default: null,
  })
  image?: {
    url: string;
    publicId: string;
  } | null;

  @Prop({ required: true, min: 1 })
  order!: number;

  /** Missing values stay public so records created before this field still appear. */
  @Prop({ default: true })
  isVisible!: boolean;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

ServiceSchema.index({ order: 1 });
ServiceSchema.index({ isVisible: 1, order: 1 });
