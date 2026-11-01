import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  type EmployeeStatus,
  type EmploymentType,
} from '../constants/employee.constants';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ _id: false })
export class EmployeeFile {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  publicId!: string;

  @Prop({ required: true })
  fileName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true, type: String, enum: ['image', 'raw'] })
  resourceType!: 'image' | 'raw';
}

const EmployeeFileSchema = SchemaFactory.createForClass(EmployeeFile);

@Schema({
  timestamps: true,
  collection: 'employees',
})
export class Employee {
  @Prop({ required: true, unique: true, trim: true })
  employeeCode!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  @Prop({ type: String, default: null })
  dateOfBirth!: string | null;

  @Prop({ trim: true, default: '' })
  address!: string;

  @Prop({ trim: true, default: '' })
  emergencyContactName!: string;

  @Prop({ trim: true, default: '' })
  emergencyContactPhone!: string;

  @Prop({ required: true, trim: true })
  department!: string;

  @Prop({ required: true, trim: true })
  designation!: string;

  @Prop({ required: true, trim: true })
  workLocation!: string;

  @Prop({ required: true, type: String, enum: EMPLOYMENT_TYPES })
  employmentType!: EmploymentType;

  @Prop({ required: true })
  joiningDate!: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  reportingManagerId!: Types.ObjectId | null;

  @Prop({
    type: String,
    enum: EMPLOYEE_STATUSES,
    default: 'onboarding',
    index: true,
  })
  status!: EmployeeStatus;

  @Prop({ type: String, default: null })
  deviceUserId!: string | null;

  @Prop({ trim: true, default: '' })
  bankName!: string;

  @Prop({ trim: true, uppercase: true, default: '' })
  ifsc!: string;

  @Prop({ trim: true, default: '' })
  bankAccountName!: string;

  @Prop({ trim: true, default: '' })
  bankAccountNumber!: string;

  @Prop({ type: EmployeeFileSchema, default: null })
  photo!: EmployeeFile | null;

  @Prop({ type: EmployeeFileSchema, default: null })
  idProof!: EmployeeFile | null;

  @Prop({ type: EmployeeFileSchema, default: null })
  pan!: EmployeeFile | null;

  @Prop({ type: EmployeeFileSchema, default: null })
  bankProof!: EmployeeFile | null;

  @Prop({ type: EmployeeFileSchema, default: null })
  offerLetter!: EmployeeFile | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index(
  { deviceUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { deviceUserId: { $type: 'string' } },
  },
);
EmployeeSchema.index({ createdAt: -1 });
