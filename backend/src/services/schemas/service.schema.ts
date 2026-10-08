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

  @Prop({ required: false, trim: true })
  icon?: string;

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
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

ServiceSchema.index({ order: 1 });
