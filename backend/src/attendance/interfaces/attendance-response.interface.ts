import type {
  AttendanceSource,
  AttendanceStatus,
} from '../constants/attendance.constants';

export interface AttendanceDayRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  designation: string;
  deviceUserId: string | null;
  joiningDate: string;
  status: AttendanceStatus | null;
  checkIn: string | null;
  checkOut: string | null;
  note: string;
  source: AttendanceSource | null;
  markedAt: string | null;
}

export interface AttendanceDayResult {
  date: string;
  rows: AttendanceDayRow[];
}
