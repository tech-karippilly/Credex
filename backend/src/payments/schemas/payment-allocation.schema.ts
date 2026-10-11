import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Payment } from './payment.schema';
import { Voucher } from '../../vouchers/schemas/voucher.schema';

export type PaymentAllocationDocument = HydratedDocument<PaymentAllocation>;

@Schema({
  timestamps: true,
  collection: 'payment_allocations',
})
export class PaymentAllocation {
  @Prop({ type: Types.ObjectId, ref: Payment.name, required: true, index: true })
  paymentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Voucher.name, required: true, index: true })
  voucherId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amountPaise!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentAllocationSchema =
  SchemaFactory.createForClass(PaymentAllocation);

PaymentAllocationSchema.index({ paymentId: 1, voucherId: 1 }, { unique: true });
