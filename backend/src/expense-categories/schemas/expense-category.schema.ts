import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocument = HydratedDocument<ExpenseCategory>;

@Schema({
  timestamps: true,
  collection: 'expense_categories',
})
export class ExpenseCategory {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, lowercase: true })
  nameNormalized!: string;

  @Prop({ required: false, trim: true, default: '' })
  description?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ required: true, min: 1, default: 1 })
  order!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

ExpenseCategorySchema.index({ nameNormalized: 1 }, { unique: true });
ExpenseCategorySchema.index({ isActive: 1 });
ExpenseCategorySchema.index({ order: 1 });
