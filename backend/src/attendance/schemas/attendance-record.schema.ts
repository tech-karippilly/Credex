import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ATTENDANCE_SOURCES,
  ATTENDANCE_STATUSES,
  type AttendanceSource,
  type AttendanceStatus,
} from '../constants/attendance.constants';

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;

@Schema({
  timestamps: true,
  collection: 'attendance_records',
})
export class AttendanceRecord {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  date!: string;

  @Prop({ required: true, type: String, enum: ATTENDANCE_STATUSES })
  status!: AttendanceStatus;

  @Prop({ type: String, default: null })
  checkIn!: string | null;

  @Prop({ type: String, default: null })
  checkOut!: string | null;

  @Prop({ trim: true, default: '' })
  note!: string;

  @Prop({ required: true, type: String, enum: ATTENDANCE_SOURCES, default: 'manual' })
  source!: AttendanceSource;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  markedByUserId!: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AttendanceRecordSchema =
  SchemaFactory.createForClass(AttendanceRecord);

AttendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceRecordSchema.index({ date: 1 });
