import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PAYMENT_MODES } from '../../vouchers/constants/voucher.constants';
import { ALL_PAYMENT_STATUSES } from '../constants/payment.constants';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({
  timestamps: true,
  collection: 'payments',
})
export class Payment {
  @Prop({ required: true, unique: true, trim: true, index: true })
  paymentNumber!: string;

  @Prop({ required: true, enum: PAYMENT_MODES, index: true })
  paymentMethod!: string;

  @Prop({ type: Date, required: true, index: true })
  paymentDate!: Date;

  @Prop({ required: true, min: 1 })
  amountPaise!: number;

  @Prop({ required: true, trim: true })
  payee!: string;

  @Prop({ trim: true, default: '' })
  sourceAccount!: string;

  @Prop({ trim: true, default: '' })
  sourceAccountNormalized!: string;

  @Prop({ trim: true, default: '' })
  referenceNumber!: string;

  @Prop({ trim: true, default: '' })
  chequeNumber!: string;

  @Prop({ trim: true, default: '' })
  chequeNumberNormalized!: string;

  @Prop({ type: Date, default: null })
  chequeDate?: Date | null;

  @Prop({ trim: true, default: '' })
  transferMethod!: string;

  @Prop({ trim: true, default: '' })
  remarks!: string;

  @Prop({ required: true, enum: ALL_PAYMENT_STATUSES, index: true })
  status!: string;

  @Prop({ required: true, default: 0 })
  version!: number;

  @Prop({ required: true, trim: true })
  createdByUserId!: string;

  @Prop({ required: true, trim: true })
  createdByEmail!: string;

  @Prop({
    type: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      fileName: { type: String, required: true },
      mimeType: { type: String, required: true },
    },
    default: null,
  })
  document?: {
    url: string;
    publicId: string;
    fileName: string;
    mimeType: string;
  } | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
  { chequeNumberNormalized: 1, sourceAccountNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentMethod: 'CHEQUE',
      chequeNumberNormalized: { $type: 'string', $gt: '' },
    },
  },
);

PaymentSchema.index({ paymentDate: -1, createdAt: -1 });
