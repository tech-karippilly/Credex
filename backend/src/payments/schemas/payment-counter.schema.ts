import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentCounterDocument = HydratedDocument<PaymentCounter>;

@Schema({ collection: 'payment_counters' })
export class PaymentCounter {
  @Prop({ required: true, unique: true, index: true })
  year!: number;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export const PaymentCounterSchema = SchemaFactory.createForClass(PaymentCounter);
