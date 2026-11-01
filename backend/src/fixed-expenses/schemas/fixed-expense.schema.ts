import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ExpenseCategory } from '../../expense-categories/schemas/expense-category.schema';
import { EXPENSE_CURRENCY } from '../../expenses/constants/expense-categories';

export type FixedExpenseDocument = HydratedDocument<FixedExpense>;

@Schema({
  timestamps: true,
  collection: 'fixed_expenses',
})
export class FixedExpense {
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

  /** Calendar day (1–28) used when generating a monthly expense. */
  @Prop({ required: true, min: 1, max: 28 })
  dayOfMonth!: number;

  @Prop({ required: false, trim: true, default: '' })
  notes?: string;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FixedExpenseSchema = SchemaFactory.createForClass(FixedExpense);

FixedExpenseSchema.index({ isActive: 1, expenseName: 1 });
