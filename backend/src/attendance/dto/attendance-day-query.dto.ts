import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ATTENDANCE_DATE_PATTERN } from '../constants/attendance.constants';

function trimQuery(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AttendanceDayQueryDto {
  @Transform(({ value }) => trimQuery(value))
  @IsString()
  @Matches(ATTENDANCE_DATE_PATTERN, {
    message: 'date must be YYYY-MM-DD',
  })
  date!: string;

  @Transform(({ value }) => trimQuery(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  department?: string;

  @Transform(({ value }) => trimQuery(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
