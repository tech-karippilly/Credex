import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CareerDocument = HydratedDocument<Career>;

@Schema({
  timestamps: true,
  collection: 'careers',
})
export class Career {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  location!: string;

  @Prop({ required: true, trim: true })
  employmentType!: string;

  @Prop({ required: true, trim: true })
  experience!: string;

  @Prop({ required: true, trim: true })
  workplace!: string;

  @Prop({ required: true, trim: true })
  salary!: string;

  @Prop({
    type: [String],
    default: [],
  })
  responsibilities!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  requirements!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  goodToHave!: string[];

  @Prop({ required: true, min: 1 })
  order!: number;

  @Prop({ default: true })
  isVisible!: boolean;
}

export const CareerSchema = SchemaFactory.createForClass(Career);

CareerSchema.index({ order: 1 });
CareerSchema.index({ isVisible: 1 });
CareerSchema.index({ isVisible: 1, order: 1 });
