import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ATTENDANCE_DATE_PATTERN,
  ATTENDANCE_STATUSES,
  ATTENDANCE_TIME_PATTERN,
  type AttendanceStatus,
} from '../constants/attendance.constants';

export class AttendanceDayEntryDto {
  @IsMongoId()
  employeeId!: string;

  @IsIn(ATTENDANCE_STATUSES)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @Matches(ATTENDANCE_TIME_PATTERN, {
    message: 'checkIn must be HH:mm',
  })
  checkIn?: string | null;

  @IsOptional()
  @IsString()
  @Matches(ATTENDANCE_TIME_PATTERN, {
    message: 'checkOut must be HH:mm',
  })
  checkOut?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SaveAttendanceDayDto {
  @IsString()
  @Matches(ATTENDANCE_DATE_PATTERN, {
    message: 'date must be YYYY-MM-DD',
  })
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceDayEntryDto)
  entries!: AttendanceDayEntryDto[];
}
