export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'half_day',
  'leave',
  'wfh',
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_SOURCES = ['manual', 'essl'] as const;

export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

export const ATTENDANCE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ATTENDANCE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Included on the daily register; exited staff are omitted. */
export const ATTENDANCE_REGISTER_STATUSES = ['active', 'onboarding'] as const;
