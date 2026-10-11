import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { Expense } from '../../expenses/schemas/expense.schema';
import {
  DEFAULT_VOUCHER_STATUS,
  PAYMENT_MODES,
  VOUCHER_CURRENCY,
  VOUCHER_DELIVERY_CHANNELS,
  VOUCHER_DELIVERY_STATUSES,
  VOUCHER_STATUSES,
  VOUCHER_TYPES,
} from '../constants/voucher.constants';

export type VoucherDocument = HydratedDocument<Voucher>;

@Schema({
  timestamps: true,
  collection: 'vouchers',
})
export class Voucher {
  @Prop({ required: true, unique: true, trim: true, index: true })
  voucherNumber!: string;

  @Prop({ type: Date, required: true, index: true })
  voucherDate!: Date;

  @Prop({ required: true, enum: VOUCHER_TYPES, index: true })
  voucherType!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: false, trim: true, default: '' })
  description?: string;

  @Prop({ required: true, trim: true })
  paidBy!: string;

  @Prop({ required: true, trim: true })
  payee!: string;

  @Prop({ required: true, min: 1 })
  amountPaise!: number;

  /** Paise reserved by non-void payment allocations. Missing on historical vouchers means zero. */
  @Prop({ required: true, default: 0, min: 0 })
  reservedPaise!: number;

  /** Paise settled by cleared or completed payments only. Missing on historical vouchers means zero. */
  @Prop({ required: true, default: 0, min: 0 })
  settledPaise!: number;

  @Prop({ required: true, default: VOUCHER_CURRENCY, enum: [VOUCHER_CURRENCY] })
  currency!: string;

  @Prop({ required: true, enum: PAYMENT_MODES })
  paymentMode!: string;

  @Prop({
    type: Types.ObjectId,
    ref: ExpenseCategory.name,
    default: null,
    index: true,
  })
  categoryId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: Expense.name,
    default: null,
    index: true,
  })
  expenseId?: Types.ObjectId | null;

  @Prop({ required: false, trim: true, default: '' })
  referenceNumber?: string;

  @Prop({ required: false, trim: true, default: '' })
  notes?: string;

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

  @Prop({
    required: true,
    enum: VOUCHER_STATUSES,
    default: DEFAULT_VOUCHER_STATUS,
    index: true,
  })
  status!: string;

  @Prop({
    type: [
      {
        channel: {
          type: String,
          enum: VOUCHER_DELIVERY_CHANNELS,
          required: true,
        },
        recipient: { type: String, required: true, trim: true },
        status: {
          type: String,
          enum: VOUCHER_DELIVERY_STATUSES,
          required: true,
        },
        providerMessageId: { type: String, trim: true },
        errorSummary: { type: String, trim: true },
        attemptedAt: { type: Date, required: true },
      },
    ],
    default: [],
  })
  deliveryAttempts?: {
    channel: string;
    recipient: string;
    status: string;
    providerMessageId?: string;
    errorSummary?: string;
    attemptedAt: Date;
  }[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

VoucherSchema.index({ voucherDate: -1, createdAt: -1 });
VoucherSchema.index({ createdAt: -1 });
