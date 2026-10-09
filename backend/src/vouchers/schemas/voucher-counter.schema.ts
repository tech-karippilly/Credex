import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VoucherCounterDocument = HydratedDocument<VoucherCounter>;

@Schema({
  collection: 'voucher_counters',
})
export class VoucherCounter {
  @Prop({ required: true, unique: true, index: true })
  year!: number;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export const VoucherCounterSchema = SchemaFactory.createForClass(VoucherCounter);
