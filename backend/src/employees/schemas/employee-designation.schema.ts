import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDesignationDocument = HydratedDocument<EmployeeDesignation>;

@Schema({
  timestamps: true,
  collection: 'employee_designations',
})
export class EmployeeDesignation {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  key!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeDesignationSchema =
  SchemaFactory.createForClass(EmployeeDesignation);

EmployeeDesignationSchema.index({ name: 1 });
