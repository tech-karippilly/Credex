import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Plus, Upload } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { LedgerPagination } from "@/components/admin/ledger-pagination";
import { apiErrorMessage } from "@/lib/api";
import {
  employeesApi,
  type EmployeeDesignation,
  type EmployeeDetail,
  type EmployeeDocumentKind,
  type EmployeeFile,
  type EmployeeListItem,
  type EmployeeOption,
  type EmployeePayload,
  type EmployeeStatus,
  type EmployeeSummary,
  type EmploymentType,
} from "@/lib/employees-api";

const DOCUMENTS: Array<{
  kind: EmployeeDocumentKind;
  field: "photo" | "idProof" | "pan" | "bankProof" | "offerLetter";
  label: string;
  accept: string;
  hint: string;
}> = [
  {
    kind: "photo",
    field: "photo",
    label: "Photo",
    accept: "image/jpeg,image/png",
    hint: "JPG or PNG, up to 5 MB.",
  },
  {
    kind: "id-proof",
    field: "idProof",
    label: "ID proof",
    accept: "image/jpeg,image/png,application/pdf",
    hint: "JPG, PNG, or PDF, up to 10 MB.",
  },
  {
    kind: "pan",
    field: "pan",
    label: "PAN",
    accept: "image/jpeg,image/png,application/pdf",
    hint: "JPG, PNG, or PDF, up to 10 MB.",
  },
  {
    kind: "bank-proof",
    field: "bankProof",
    label: "Bank proof",
    accept: "image/jpeg,image/png,application/pdf",
    hint: "JPG, PNG, or PDF, up to 10 MB.",
  },
  {
    kind: "offer-letter",
    field: "offerLetter",
    label: "Offer or appointment letter",
    accept: "image/jpeg,image/png,application/pdf",
    hint: "JPG, PNG, or PDF, up to 10 MB.",
  },
];

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  department: string;
  designation: string;
  workLocation: string;
  employmentType: EmploymentType;
  joiningDate: string;
  reportingManagerId: string;
  deviceUserId: string;
  bankName: string;
  ifsc: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

const emptyForm = (): FormState => ({
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  department: "",
  designation: "",
  workLocation: "",
  employmentType: "full_time",
  joiningDate: "",
  reportingManagerId: "",
  deviceUserId: "",
  bankName: "",
  ifsc: "",
  bankAccountName: "",
  bankAccountNumber: "",
});

function formFromEmployee(employee: EmployeeDetail): FormState {
  return {
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    dateOfBirth: employee.dateOfBirth ?? "",
    address: employee.address,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactPhone: employee.emergencyContactPhone,
    department: employee.department,
    designation: employee.designation,
    workLocation: employee.workLocation,
    employmentType: employee.employmentType,
    joiningDate: employee.joiningDate,
    reportingManagerId: employee.reportingManager?.id ?? "",
    deviceUserId: employee.deviceUserId ?? "",
    bankName: employee.bankName,
    ifsc: employee.ifsc,
    bankAccountName: employee.bankAccountName,
    bankAccountNumber: employee.bankAccountNumber,
  };
}

function payloadFromForm(form: FormState): EmployeePayload {
  const blank = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    dateOfBirth: blank(form.dateOfBirth),
    address: form.address.trim(),
    emergencyContactName: form.emergencyContactName.trim(),
    emergencyContactPhone: form.emergencyContactPhone.trim(),
    department: form.department.trim(),
    designation: form.designation.trim(),
    workLocation: form.workLocation.trim(),
    employmentType: form.employmentType,
    joiningDate: form.joiningDate,
    reportingManagerId: form.reportingManagerId || null,
    deviceUserId: blank(form.deviceUserId),
    bankName: form.bankName.trim(),
    ifsc: form.ifsc.replace(/\s/g, "").toUpperCase(),
    bankAccountName: form.bankAccountName.trim(),
    bankAccountNumber: form.bankAccountNumber.replace(/\s/g, ""),
  };
}

function statusLabel(status: EmployeeStatus) {
  if (status === "onboarding") return "Onboarding";
  if (status === "active") return "Active";
  return "Exited";
}

function statusClass(status: EmployeeStatus) {
  if (status === "active") return "bg-secondary text-primary";
  if (status === "exited") return "bg-muted text-muted-foreground";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
}

function employmentLabel(type: EmploymentType) {
  return type === "contract" ? "Contract" : "Full-time";
}

function withCurrent(options: string[], current: string) {
  if (current && !options.includes(current)) return [current, ...options];
  return options;
}

const JOINING_MONTHS = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

function joiningYears(now = new Date()) {
  const latest = now.getFullYear() + 1;
  const years: string[] = [];
  for (let year = latest; year >= 1990; year -= 1) years.push(String(year));
  return years;
}

function calendarParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function daysInMonth(year: string, month: string) {
  const monthNumber = Number(month);
  if (!monthNumber) return 31;
  const yearNumber = Number(year) || 2024;
  return new Date(yearNumber, monthNumber, 0).getDate();
}

function formatJoiningDate(value: string) {
  const parts = calendarParts(value);
  if (!parts.year) return "—";
  const month = JOINING_MONTHS.find(([code]) => code === parts.month)?.[1] ?? parts.month;
  return `${Number(parts.day)} ${month} ${parts.year}`;
}

function JoiningDateFields({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [parts, setParts] = useState(calendarParts(value));

  useEffect(() => {
    setParts((current) => {
      if (value) return calendarParts(value);
      const complete = Boolean(current.year && current.month && current.day);
      return complete ? { year: "", month: "", day: "" } : current;
    });
  }, [value]);

  const dayCount = daysInMonth(parts.year, parts.month);
  const days = Array.from({ length: dayCount }, (_, index) =>
    String(index + 1).padStart(2, "0"),
  );

  function choose(key: "day" | "month" | "year", nextValue: string) {
    const next = { ...parts, [key]: nextValue };
    const maxDay = daysInMonth(next.year, next.month);
    if (next.day && Number(next.day) > maxDay) next.day = "";
    setParts(next);
    onChange(next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : "");
  }

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">Joining date</legend>
      <div className="grid grid-cols-3 gap-2">
        <select
          id="employee-joining-day"
          aria-label="Joining day"
          className="field px-2"
          required
          value={parts.day}
          onChange={(event) => choose("day", event.target.value)}
        >
          <option value="">Day</option>
          {days.map((day) => (
            <option key={day} value={day}>
              {Number(day)}
            </option>
          ))}
        </select>
        <select
          id="employee-joining-month"
          aria-label="Joining month"
          className="field px-2"
          required
          value={parts.month}
          onChange={(event) => choose("month", event.target.value)}
        >
          <option value="">Month</option>
          {JOINING_MONTHS.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
        <select
          id="employee-joining-year"
          aria-label="Joining year"
          className="field px-2"
          required
          value={parts.year}
          onChange={(event) => choose("year", event.target.value)}
        >
          <option value="">Year</option>
          {joiningYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmployeesPanel() {
  const can = useCan();
  const [rows, setRows] = useState<EmployeeListItem[] | null>(null);
  const [summary, setSummary] = useState<EmployeeSummary | null>(null);
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<EmployeeDesignation[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<"all" | EmployeeStatus>("all");
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    employeesApi
      .list({ search: appliedSearch, status, page, limit })
      .then((data) => {
        setRows(data.items);
        setTotalPages(data.totalPages);
      })
      .catch((error) => {
        setRows([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load employees") });
      });
    employeesApi
      .summary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [appliedSearch, status, page, limit]);

  useEffect(load, [load]);

  useEffect(() => {
    employeesApi
      .options()
      .then(setOptions)
      .catch(() => setOptions([]));
    employeesApi
      .setup()
      .then((data) => {
        setDepartments(data.departments.map((item) => item.name));
        setDesignations(data.designations);
      })
      .catch(() => {
        setDepartments([]);
        setDesignations([]);
      });
  }, []);

  function openCreate() {
    setEmployee(null);
    setCreating(true);
    setMsg(null);
  }

  function openEmployee(id: string) {
    setCreating(false);
    setMsg(null);
    employeesApi
      .get(id)
      .then(setEmployee)
      .catch((error) =>
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load employee") }),
      );
  }

  function backToList() {
    setEmployee(null);
    setCreating(false);
    setMsg(null);
    load();
  }

  if (creating || employee) {
    return (
      <EmployeeRecord
        employee={employee}
        options={options}
        departments={departments}
        designations={designations}
        onBack={backToList}
        onSaved={(saved) => {
          setEmployee(saved);
          setCreating(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Employee Management</h1>
          <p className="mt-2 text-muted-foreground">
            Onboard people to NEURAFORGE.AI and keep their record. New employees start as
            onboarding. When they leave, mark them exited. The record stays.
          </p>
        </div>
        {can("employees.create") && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add employee
          </button>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(["onboarding", "active", "exited"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
            className={`card-site p-5 text-left ${status === key ? "ring-2 ring-primary" : ""}`}
          >
            <p className="font-display text-3xl font-semibold">{summary ? summary[key] : "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{statusLabel(key)}</p>
          </button>
        ))}
      </div>

      <form
        className="mb-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setAppliedSearch(search.trim());
        }}
      >
        <input
          className="field"
          placeholder="Search name, code, or department"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search employees"
        />
        <select
          className="field sm:w-44"
          value={status}
          aria-label="Employee status"
          onChange={(event) => {
            setStatus(event.target.value as "all" | EmployeeStatus);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="onboarding">Onboarding</option>
          <option value="active">Active</option>
          <option value="exited">Exited</option>
        </select>
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      {!rows ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">
          No employees match this search.
        </div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Location</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Status</th>
                <th className="p-4">eSSL id</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{row.employeeCode}</td>
                  <td className="p-4">{row.fullName}</td>
                  <td className="p-4">{row.department}</td>
                  <td className="p-4">{row.designation}</td>
                  <td className="p-4">{row.workLocation}</td>
                  <td className="p-4 whitespace-nowrap">{formatJoiningDate(row.joiningDate)}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="p-4">{row.deviceUserId || "—"}</td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      className="btn btn-outline h-9 px-3 text-sm"
                      onClick={() => openEmployee(row.id)}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <LedgerPagination
        pageSizeId="employees-page-size"
        page={page}
        totalPages={totalPages}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />
    </>
  );
}

function EmployeeRecord({
  employee,
  options,
  departments,
  designations,
  onBack,
  onSaved,
}: {
  employee: EmployeeDetail | null;
  options: EmployeeOption[];
  departments: string[];
  designations: EmployeeDesignation[];
  onBack: () => void;
  onSaved: (employee: EmployeeDetail) => void;
}) {
  const can = useCan();
  const canEdit = employee ? can("employees.update") : can("employees.create");
  const [form, setForm] = useState<FormState>(employee ? formFromEmployee(employee) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setForm(employee ? formFromEmployee(employee) : emptyForm());
  }, [employee]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const payload = payloadFromForm(form);
    if (
      !payload.fullName ||
      !payload.email ||
      !payload.phone ||
      !payload.department ||
      !payload.designation ||
      !payload.workLocation ||
      !payload.joiningDate
    ) {
      setMsg({
        ok: false,
        text: "Name, email, phone, department, designation, work location, and joining date are required.",
      });
      return;
    }
    const bankFields = [
      payload.bankName,
      payload.ifsc,
      payload.bankAccountName,
      payload.bankAccountNumber,
    ];
    const filledBankFields = bankFields.filter(Boolean).length;
    if (filledBankFields > 0 && filledBankFields < bankFields.length) {
      setMsg({
        ok: false,
        text: "Bank name, IFSC, account name, and account number must all be provided.",
      });
      return;
    }
    if (payload.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payload.ifsc)) {
      setMsg({ ok: false, text: "IFSC must be 11 characters, like HDFC0001234." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const saved = employee
        ? await employeesApi.update(employee.id, payload)
        : await employeesApi.create(payload);
      onSaved(saved);
      setMsg({
        ok: true,
        text: employee
          ? "Employee record saved."
          : `${saved.employeeCode} added. Upload documents and mark them active when the record is complete.`,
      });
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save employee") });
    }
    setBusy(false);
  }

  async function changeStatus(status: EmployeeStatus) {
    if (!employee) return;
    if (
      status === "exited" &&
      !confirm(`Mark ${employee.fullName} as exited? The record stays on file.`)
    )
      return;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await employeesApi.updateStatus(employee.id, status);
      onSaved(saved);
      setMsg({ ok: true, text: `Status set to ${statusLabel(status)}.` });
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not update status") });
    }
    setBusy(false);
  }

  const managers = options.filter((option) => option.id !== employee?.id);

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {employee ? `${employee.employeeCode} · ${employee.fullName}` : "Add employee"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {employee
              ? "NEURAFORGE.AI employee record. The employee code stays with this person."
              : "The employee code is assigned when you save. The record starts as onboarding."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to employee list
          </button>
          {employee && can("employees.status.update") && employee.status !== "active" && (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => changeStatus("active")}
            >
              Mark active
            </button>
          )}
          {employee && can("employees.status.update") && employee.status !== "exited" && (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => changeStatus("exited")}
            >
              Mark exited
            </button>
          )}
          {canEdit && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save employee
            </button>
          )}
        </div>
      </div>

      {employee && (
        <p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(employee.status)}`}
          >
            {statusLabel(employee.status)}
          </span>
        </p>
      )}
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      <section className="card-site space-y-5 p-6 md:p-8">
        <h2 className="text-lg font-semibold">Personal details</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="employee-name" label="Full name">
            <input
              id="employee-name"
              className="field"
              required
              readOnly={!canEdit}
              value={form.fullName}
              onChange={(event) => set("fullName", event.target.value)}
            />
          </Field>
          <Field id="employee-email" label="Email">
            <input
              id="employee-email"
              type="email"
              className="field"
              required
              readOnly={!canEdit}
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
            />
          </Field>
          <Field id="employee-phone" label="Phone">
            <input
              id="employee-phone"
              type="tel"
              className="field"
              required
              readOnly={!canEdit}
              value={form.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </Field>
          <Field id="employee-dob" label="Date of birth">
            <input
              id="employee-dob"
              type="date"
              className="field"
              readOnly={!canEdit}
              value={form.dateOfBirth}
              onChange={(event) => set("dateOfBirth", event.target.value)}
            />
          </Field>
          <div className="md:col-span-2">
            <Field id="employee-address" label="Address">
              <textarea
                id="employee-address"
                rows={3}
                className="field h-auto py-3"
                readOnly={!canEdit}
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
              />
            </Field>
          </div>
          <Field id="employee-emergency-name" label="Emergency contact name">
            <input
              id="employee-emergency-name"
              className="field"
              readOnly={!canEdit}
              value={form.emergencyContactName}
              onChange={(event) => set("emergencyContactName", event.target.value)}
            />
          </Field>
          <Field id="employee-emergency-phone" label="Emergency contact phone">
            <input
              id="employee-emergency-phone"
              type="tel"
              className="field"
              readOnly={!canEdit}
              value={form.emergencyContactPhone}
              onChange={(event) => set("emergencyContactPhone", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="card-site space-y-5 p-6 md:p-8">
        <h2 className="text-lg font-semibold">Job</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="employee-department" label="Department">
            <select
              id="employee-department"
              className="field"
              required
              disabled={!canEdit}
              value={form.department}
              onChange={(event) => set("department", event.target.value)}
            >
              <option value="">Select department</option>
              {withCurrent(departments, form.department).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="employee-designation"
            label="Designation"
            hint="Add designations under HR → Designations."
          >
            <select
              id="employee-designation"
              className="field"
              required
              disabled={!canEdit}
              value={form.designation}
              onChange={(event) => set("designation", event.target.value)}
            >
              <option value="">Select designation</option>
              {withCurrent(
                designations.map((item) => item.name),
                form.designation,
              ).map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
          </Field>
          <Field id="employee-location" label="Work location">
            <input
              id="employee-location"
              className="field"
              required
              readOnly={!canEdit}
              value={form.workLocation}
              onChange={(event) => set("workLocation", event.target.value)}
            />
          </Field>
          <Field id="employee-type" label="Employment type">
            <select
              id="employee-type"
              className="field"
              disabled={!canEdit}
              value={form.employmentType}
              onChange={(event) => set("employmentType", event.target.value as EmploymentType)}
            >
              <option value="full_time">Full-time</option>
              <option value="contract">Contract</option>
            </select>
          </Field>
          <JoiningDateFields
            value={form.joiningDate}
            disabled={!canEdit}
            onChange={(value) => set("joiningDate", value)}
          />
          <Field id="employee-manager" label="Reporting manager">
            <select
              id="employee-manager"
              className="field"
              disabled={!canEdit}
              value={form.reportingManagerId}
              onChange={(event) => set("reportingManagerId", event.target.value)}
            >
              <option value="">None</option>
              {managers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.fullName} ({option.employeeCode})
                  {option.status === "exited" ? " · Exited" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="card-site space-y-5 p-6 md:p-8">
        <h2 className="text-lg font-semibold">Bank account</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="employee-bank" label="Bank name">
            <input
              id="employee-bank"
              className="field"
              autoComplete="off"
              readOnly={!canEdit}
              value={form.bankName}
              onChange={(event) => set("bankName", event.target.value)}
            />
          </Field>
          <Field
            id="employee-ifsc"
            label="IFSC"
            hint="11 characters, like HDFC0001234. Leave all bank fields empty until you have them."
          >
            <input
              id="employee-ifsc"
              className="field"
              autoComplete="off"
              maxLength={11}
              readOnly={!canEdit}
              value={form.ifsc}
              onChange={(event) => set("ifsc", event.target.value.toUpperCase())}
            />
          </Field>
          <Field id="employee-bank-name" label="Account name">
            <input
              id="employee-bank-name"
              className="field"
              autoComplete="off"
              readOnly={!canEdit}
              value={form.bankAccountName}
              onChange={(event) => set("bankAccountName", event.target.value)}
            />
          </Field>
          <Field
            id="employee-bank-number"
            label="Account number"
            hint="9 to 18 digits."
          >
            <input
              id="employee-bank-number"
              className="field"
              inputMode="numeric"
              autoComplete="off"
              readOnly={!canEdit}
              value={form.bankAccountNumber}
              onChange={(event) => set("bankAccountNumber", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="card-site space-y-5 p-6 md:p-8">
        <h2 className="text-lg font-semibold">eSSL attendance</h2>
        <Field
          id="employee-device"
          label="Device user id"
          hint="The user id enrolled on the office eSSL machine. Leave blank until that person is enrolled."
        >
          <input
            id="employee-device"
            className="field md:max-w-sm"
            readOnly={!canEdit}
            value={form.deviceUserId}
            onChange={(event) => set("deviceUserId", event.target.value)}
          />
        </Field>
      </section>

      {employee && (
        <section className="card-site space-y-5 p-6 md:p-8">
          <h2 className="text-lg font-semibold">Documents</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {DOCUMENTS.map((document) => (
              <DocumentField
                key={document.kind}
                id={`employee-${document.kind}`}
                label={document.label}
                hint={document.hint}
                accept={document.accept}
                file={employee[document.field]}
                locked={!can("employees.update")}
                onUpload={async (file) => {
                  const saved = await employeesApi.uploadDocument(employee.id, document.kind, file);
                  onSaved(saved);
                }}
                onRemove={async () => {
                  const saved = await employeesApi.deleteDocument(employee.id, document.kind);
                  onSaved(saved);
                }}
              />
            ))}
          </div>
        </section>
      )}

      {employee && (
        <p className="text-sm text-muted-foreground">
          {employmentLabel(employee.employmentType)} · Joined {formatJoiningDate(employee.joiningDate)}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to employee list
        </button>
      </div>
    </form>
  );
}

function DocumentField({
  id,
  label,
  hint,
  accept,
  file,
  locked,
  onUpload,
  onRemove,
}: {
  id: string;
  label: string;
  hint: string;
  accept: string;
  file: EmployeeFile | null;
  locked: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  return (
    <Field id={id} label={label} hint={hint}>
      <div className="flex flex-wrap items-center gap-3">
        {file?.mimeType.startsWith("image/") ? (
          <img
            src={file.url}
            alt=""
            className="h-16 w-16 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="text-sm text-muted-foreground">{file ? file.fileName : "No file"}</span>
        )}
        {!locked && (
          <label htmlFor={id} className="btn btn-outline h-10 cursor-pointer px-4 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{" "}
            Upload
            <input
              id={id}
              type="file"
              accept={accept}
              className="sr-only"
              disabled={busy}
              onChange={async (event) => {
                const next = event.target.files?.[0];
                if (!next) return;
                setBusy(true);
                setErr("");
                try {
                  await onUpload(next);
                } catch (error) {
                  setErr(apiErrorMessage(error, "Upload failed"));
                }
                setBusy(false);
                event.target.value = "";
              }}
            />
          </label>
        )}
        {!locked && file && (
          <button
            type="button"
            className="btn btn-outline h-10 px-4 text-sm"
            onClick={async () => {
              setBusy(true);
              setErr("");
              try {
                await onRemove();
              } catch (error) {
                setErr(apiErrorMessage(error, "Could not remove document"));
              }
              setBusy(false);
            }}
          >
            Remove
          </button>
        )}
        {file && (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary"
          >
            View
          </a>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </Field>
  );
}
