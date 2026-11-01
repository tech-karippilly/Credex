import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDepartmentDocument = HydratedDocument<EmployeeDepartment>;

@Schema({
  timestamps: true,
  collection: 'employee_departments',
})
export class EmployeeDepartment {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  key!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeDepartmentSchema =
  SchemaFactory.createForClass(EmployeeDepartment);

EmployeeDepartmentSchema.index({ name: 1 });
