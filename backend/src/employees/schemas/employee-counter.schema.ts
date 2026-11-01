import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeCounterDocument = HydratedDocument<EmployeeCounter>;

@Schema({ collection: 'employee_counters' })
export class EmployeeCounter {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true, default: 0 })
  seq!: number;
}

export const EmployeeCounterSchema =
  SchemaFactory.createForClass(EmployeeCounter);
