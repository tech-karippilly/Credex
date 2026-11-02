import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import { employeesApi } from "@/lib/employees-api";
import {
  ATTENDANCE_STATUS_OPTIONS,
  attendanceApi,
  type AttendanceDayRow,
  type AttendanceStatus,
} from "@/lib/attendance-api";

type RowDraft = {
  status: AttendanceStatus | "";
  checkIn: string;
  checkOut: string;
  note: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function draftFromRow(row: AttendanceDayRow): RowDraft {
  return {
    status: row.status ?? "",
    checkIn: row.checkIn ?? "",
    checkOut: row.checkOut ?? "",
    note: row.note ?? "",
  };
}

function statusBadgeClass(status: AttendanceStatus | null): string {
  if (status === "present") return "bg-secondary text-primary";
  if (status === "wfh") return "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100";
  if (status === "half_day") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
  if (status === "leave") return "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100";
  if (status === "absent") return "bg-destructive/15 text-destructive";
  return "bg-muted text-muted-foreground";
}

function statusLabel(status: AttendanceStatus | null): string {
  if (!status) return "Unmarked";
  return ATTENDANCE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export function AttendancePanel() {
  const can = useCan();
  const canEdit = can("attendance.update");
  const [date, setDate] = useState(todayIsoDate);
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [appliedDepartment, setAppliedDepartment] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [rows, setRows] = useState<AttendanceDayRow[] | null>(null);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    employeesApi
      .setup()
      .then((setup) => setDepartmentOptions(setup.departments.map((item) => item.name)))
      .catch(() => undefined);
  }, []);

  const load = useCallback(() => {
    setRows(null);
    attendanceApi
      .getDay({
        date,
        department: appliedDepartment || undefined,
        search: appliedSearch || undefined,
      })
      .then((result) => {
        setRows(result.rows);
        setDrafts(Object.fromEntries(result.rows.map((row) => [row.employeeId, draftFromRow(row)])));
      })
      .catch((error) => {
        setRows([]);
        setDrafts({});
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load attendance") });
      });
  }, [appliedDepartment, appliedSearch, date]);

  useEffect(() => {
    load();
  }, [load]);

  const unmarkedCount = useMemo(
    () => Object.values(drafts).filter((draft) => !draft.status).length,
    [drafts],
  );

  function setDraft(employeeId: string, patch: Partial<RowDraft>) {
    setDrafts((current) => ({
      ...current,
      [employeeId]: { ...current[employeeId], ...patch },
    }));
  }

  function markAllPresent() {
    setDrafts((current) => {
      const next = { ...current };
      for (const row of rows ?? []) {
        if (date < row.joiningDate) continue;
        next[row.employeeId] = {
          ...next[row.employeeId],
          status: "present",
        };
      }
      return next;
    });
  }

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setAppliedDepartment(department.trim());
    setAppliedSearch(search.trim());
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!rows?.length) return;

    const eligible = rows.filter((row) => date >= row.joiningDate);
    const missing = eligible.filter((row) => !drafts[row.employeeId]?.status);
    if (missing.length > 0) {
      setMsg({
        ok: false,
        text: `Mark attendance for everyone on this list (${missing.length} still unmarked).`,
      });
      return;
    }

    const entries = eligible.map((row) => {
      const draft = drafts[row.employeeId];
      return {
        employeeId: row.employeeId,
        status: draft.status as AttendanceStatus,
        checkIn: draft.checkIn.trim() || null,
        checkOut: draft.checkOut.trim() || null,
        note: draft.note.trim() || undefined,
      };
    });

    setBusy(true);
    setMsg(null);
    try {
      await attendanceApi.saveDay(date, entries);
      load();
      setMsg({ ok: true, text: "Attendance saved." });
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save attendance") });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Attendance</h1>
          <p className="mt-2 text-muted-foreground">
            Mark daily attendance manually for active and onboarding employees. eSSL sync can be added later.
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline" onClick={markAllPresent} disabled={!rows?.length}>
              Mark all present
            </button>
            <button type="submit" form="attendance-day-form" className="btn btn-primary" disabled={busy || !rows?.length}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save day
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      <form onSubmit={applyFilters} className="card-site mb-6 grid gap-4 p-4 md:grid-cols-4 md:items-end">
        <div>
          <label htmlFor="attendance-date" className="mb-2 block text-sm font-semibold">
            Date
          </label>
          <input
            id="attendance-date"
            type="date"
            className="field"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="attendance-department" className="mb-2 block text-sm font-semibold">
            Department
          </label>
          <select
            id="attendance-department"
            className="field"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">All departments</option>
            {departmentOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="attendance-search" className="mb-2 block text-sm font-semibold">
            Search
          </label>
          <input
            id="attendance-search"
            className="field"
            placeholder="Name or employee code"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-outline h-11">
          Apply filters
        </button>
      </form>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading attendance…</p>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">
          No employees match these filters. Add people in Employee Management first.
        </div>
      ) : (
        <form id="attendance-day-form" onSubmit={save} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {rows.length} on this list
            {unmarkedCount > 0 ? ` · ${unmarkedCount} unmarked` : " · all marked"}
          </p>
          <div className="card-site overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">eSSL id</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">In</th>
                  <th className="p-4">Out</th>
                  <th className="p-4">Note</th>
                  <th className="p-4">Saved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draft = drafts[row.employeeId] ?? draftFromRow(row);
                  const beforeJoin = date < row.joiningDate;
                  return (
                    <tr key={row.employeeId} className="border-b border-border last:border-0 align-top">
                      <td className="p-4 font-medium">{row.employeeCode}</td>
                      <td className="p-4">
                        <div>{row.fullName}</div>
                        {beforeJoin && (
                          <p className="mt-1 text-xs text-muted-foreground">Joins {row.joiningDate}</p>
                        )}
                      </td>
                      <td className="p-4">{row.department}</td>
                      <td className="p-4">{row.deviceUserId || "—"}</td>
                      <td className="p-4">
                        {beforeJoin ? (
                          <span className="text-xs text-muted-foreground">Not applicable</span>
                        ) : canEdit ? (
                          <select
                            className="field min-w-[9rem]"
                            value={draft.status}
                            onChange={(event) =>
                              setDraft(row.employeeId, {
                                status: event.target.value as AttendanceStatus | "",
                              })
                            }
                          >
                            <option value="">Choose…</option>
                            {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <input
                          className="field w-24"
                          placeholder="09:30"
                          inputMode="numeric"
                          readOnly={!canEdit || beforeJoin}
                          value={draft.checkIn}
                          onChange={(event) => setDraft(row.employeeId, { checkIn: event.target.value })}
                        />
                      </td>
                      <td className="p-4">
                        <input
                          className="field w-24"
                          placeholder="18:00"
                          inputMode="numeric"
                          readOnly={!canEdit || beforeJoin}
                          value={draft.checkOut}
                          onChange={(event) => setDraft(row.employeeId, { checkOut: event.target.value })}
                        />
                      </td>
                      <td className="p-4">
                        <input
                          className="field min-w-[10rem]"
                          readOnly={!canEdit || beforeJoin}
                          value={draft.note}
                          onChange={(event) => setDraft(row.employeeId, { note: event.target.value })}
                        />
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {row.markedAt ? (
                          <>
                            {statusLabel(row.status)}
                            {row.source === "manual" ? " · manual" : row.source ? ` · ${row.source}` : ""}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}
    </>
  );
}
