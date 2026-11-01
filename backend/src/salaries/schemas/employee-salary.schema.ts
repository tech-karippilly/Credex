import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmployeeSalaryDocument = HydratedDocument<EmployeeSalary>;

@Schema({
  timestamps: true,
  collection: 'employee_salaries',
})
export class EmployeeSalary {
  @Prop({
    type: Types.ObjectId,
    ref: 'Employee',
    required: true,
    unique: true,
  })
  employeeId!: Types.ObjectId;

  @Prop({ required: true, min: 0, default: 0 })
  basePay!: number;

  @Prop({ required: true, min: 0, default: 0 })
  houseRentAllowance!: number;

  @Prop({ required: true, min: 0, default: 0 })
  esi!: number;

  @Prop({ required: true, min: 0, default: 0 })
  pf!: number;

  @Prop({ required: true, min: 0, default: 0 })
  tax!: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeSalarySchema =
  SchemaFactory.createForClass(EmployeeSalary);
