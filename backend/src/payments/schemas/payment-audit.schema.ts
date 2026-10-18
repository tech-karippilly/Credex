import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AUDIT_ACTIONS } from '../constants/payment.constants';
import { Payment } from './payment.schema';

export type PaymentAuditDocument = HydratedDocument<PaymentAudit>;

@Schema({ _id: false })
class PaymentAuditChange {
  @Prop({ required: true, trim: true })
  field!: string;

  @Prop({ type: String, default: '' })
  previous!: string;

  @Prop({ type: String, default: '' })
  next!: string;
}

const PaymentAuditChangeSchema = SchemaFactory.createForClass(PaymentAuditChange);

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'payment_audits',
})
export class PaymentAudit {
  @Prop({ type: Types.ObjectId, ref: Payment.name, required: true, index: true })
  paymentId!: Types.ObjectId;

  @Prop({ required: true, enum: AUDIT_ACTIONS })
  action!: string;

  @Prop({ required: true, trim: true })
  actorId!: string;

  @Prop({ required: true, trim: true })
  actorEmail!: string;

  @Prop({ required: true, trim: true })
  summary!: string;

  @Prop({ type: [PaymentAuditChangeSchema], default: [] })
  changes!: PaymentAuditChange[];

  createdAt?: Date;
}

export const PaymentAuditSchema = SchemaFactory.createForClass(PaymentAudit);

PaymentAuditSchema.index({ paymentId: 1, createdAt: -1 });
