import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { EXPENSE_CURRENCY } from '../constants/expense-categories';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({
  timestamps: true,
  collection: 'expenses',
})
export class Expense {
  @Prop({ required: true, trim: true })
  expenseName!: string;

  @Prop({
    type: Types.ObjectId,
    ref: ExpenseCategory.name,
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  paidBy!: string;

  @Prop({ required: true, min: 1 })
  amountPaise!: number;

  @Prop({ required: true, default: EXPENSE_CURRENCY, enum: [EXPENSE_CURRENCY] })
  currency!: string;

  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({
    type: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      fileName: { type: String, required: true },
      mimeType: { type: String, required: true },
    },
    default: null,
  })
  receipt?: {
    url: string;
    publicId: string;
    fileName: string;
    mimeType: string;
  } | null;

  @Prop({ required: false, trim: true, default: '' })
  notes?: string;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  fixedExpenseId?: Types.ObjectId | null;

  /** YYYY-MM when this row was generated from a fixed expense template. */
  @Prop({ type: String, required: false, trim: true, default: null })
  generatedForMonth?: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ date: -1, createdAt: -1 });
ExpenseSchema.index({ paidBy: 1 });
ExpenseSchema.index({ categoryId: 1, date: -1 });
ExpenseSchema.index(
  { fixedExpenseId: 1, generatedForMonth: 1 },
  {
    unique: true,
    partialFilterExpression: {
      fixedExpenseId: { $type: 'objectId' },
      generatedForMonth: { $type: 'string' },
    },
  },
);
