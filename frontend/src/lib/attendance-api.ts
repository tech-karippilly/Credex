import { apiRequest } from "./api";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "wfh";

export type AttendanceSource = "manual" | "essl";

export type AttendanceDayRow = {
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
};

export type AttendanceDayResult = {
  date: string;
  rows: AttendanceDayRow[];
};

export type AttendanceDayEntry = {
  employeeId: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string;
};

export type AttendanceDayQuery = {
  date: string;
  department?: string;
  search?: string;
};

function dayQuery(query: AttendanceDayQuery): string {
  const params = new URLSearchParams({ date: query.date });
  if (query.department?.trim()) params.set("department", query.department.trim());
  if (query.search?.trim()) params.set("search", query.search.trim());
  return params.toString();
}

export const ATTENDANCE_STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half day" },
  { value: "leave", label: "Leave" },
  { value: "wfh", label: "WFH" },
];

export const attendanceApi = {
  getDay(query: AttendanceDayQuery): Promise<AttendanceDayResult> {
    return apiRequest<AttendanceDayResult>(`/attendance?${dayQuery(query)}`, { auth: true });
  },

  saveDay(date: string, entries: AttendanceDayEntry[]): Promise<AttendanceDayResult> {
    return apiRequest<AttendanceDayResult>("/attendance/day", {
      method: "PUT",
      auth: true,
      json: { date, entries },
    });
  },
};
