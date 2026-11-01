import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import type { EmployeeStatus } from "@/lib/employees-api";
import { salariesApi, type SalaryPayload, type SalaryRecord } from "@/lib/salaries-api";

const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);

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

function moneyInput(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * 100) / 100;
}

type SalaryForm = {
  basePay: string;
  houseRentAllowance: string;
  esi: string;
  pf: string;
  tax: string;
};

function formFromRecord(record: SalaryRecord): SalaryForm {
  return {
    basePay: String(record.basePay),
    houseRentAllowance: String(record.houseRentAllowance),
    esi: String(record.esi),
    pf: String(record.pf),
    tax: String(record.tax),
  };
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
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

export function SalariesPanel() {
  const [rows, setRows] = useState<SalaryRecord[] | null>(null);
  const [selected, setSelected] = useState<SalaryRecord | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    salariesApi
      .list()
      .then(setRows)
      .catch((error) => {
        setRows([]);
        setMsg({ ok: false, text: apiErrorMessage(error, "Could not load salaries") });
      });
  }, []);

  useEffect(load, [load]);

  if (selected) {
    return (
      <SalaryEditor
        record={selected}
        onBack={() => {
          setSelected(null);
          setMsg(null);
          load();
        }}
        onSaved={(saved) => {
          setSelected(saved);
          setRows((current) =>
            current?.map((row) => (row.employeeId === saved.employeeId ? saved : row)) ?? [saved],
          );
        }}
      />
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Salary Management</h1>
        <p className="mt-2 text-muted-foreground">
          Current monthly salary for each employee. Open a person to edit base pay, ESI, PF, and the other lines.
        </p>
      </div>
      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}
      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading salaries…</p>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">
          No employees yet. Add people in Employee Management first.
        </div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Base pay</th>
                <th className="p-4 text-right">Current salary</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.employeeId} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{row.employeeCode}</td>
                  <td className="p-4">{row.fullName}</td>
                  <td className="p-4">{row.department}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right">{inr(row.basePay)}</td>
                  <td className="p-4 text-right font-medium">{inr(row.netPay)}</td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      className="btn btn-outline h-9 px-3 text-sm"
                      onClick={() => {
                        setMsg(null);
                        setSelected(row);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SalaryEditor({
  record,
  onBack,
  onSaved,
}: {
  record: SalaryRecord;
  onBack: () => void;
  onSaved: (record: SalaryRecord) => void;
}) {
  const can = useCan();
  const canEdit = can("salaries.update");
  const [form, setForm] = useState<SalaryForm>(formFromRecord(record));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setForm(formFromRecord(record));
  }, [record]);

  function set<K extends keyof SalaryForm>(key: K, value: SalaryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const amounts = {
    basePay: moneyInput(form.basePay),
    houseRentAllowance: moneyInput(form.houseRentAllowance),
    esi: moneyInput(form.esi),
    pf: moneyInput(form.pf),
    tax: moneyInput(form.tax),
  };
  const gross = amounts.basePay + amounts.houseRentAllowance;
  const deductions = amounts.esi + amounts.pf + amounts.tax;
  const netPay = gross - deductions;
  const amountsReady = Object.values(amounts).every((value) => Number.isFinite(value) && value >= 0);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!amountsReady) {
      setMsg({ ok: false, text: "Enter amounts as numbers, or 0." });
      return;
    }
    if (netPay < 0) {
      setMsg({
        ok: false,
        text: "ESI, PF, and tax cannot be more than base pay plus house rent allowance.",
      });
      return;
    }
    const payload: SalaryPayload = amounts;
    setBusy(true);
    setMsg(null);
    try {
      const saved = await salariesApi.update(record.employeeId, payload);
      onSaved(saved);
      setMsg({ ok: true, text: "Salary saved." });
    } catch (error) {
      setMsg({ ok: false, text: apiErrorMessage(error, "Could not save salary") });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">
            {record.employeeCode} · {record.fullName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {record.department} · {record.designation}. Leave a line at 0 until it applies.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to salary list
          </button>
          {canEdit && (
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save salary
            </button>
          )}
        </div>
      </div>

      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      <section className="card-site space-y-5 p-6 md:p-8">
        <h2 className="text-lg font-semibold">Salary details</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="salary-base" label="Base pay">
            <input
              id="salary-base"
              className="field"
              inputMode="decimal"
              readOnly={!canEdit}
              value={form.basePay}
              onChange={(event) => set("basePay", event.target.value)}
            />
          </Field>
          <Field id="salary-hra" label="House rent allowance" hint="Leave at 0 until you pay this.">
            <input
              id="salary-hra"
              className="field"
              inputMode="decimal"
              readOnly={!canEdit}
              value={form.houseRentAllowance}
              onChange={(event) => set("houseRentAllowance", event.target.value)}
            />
          </Field>
          <Field id="salary-esi" label="ESI" hint="Leave at 0 until you deduct this.">
            <input
              id="salary-esi"
              className="field"
              inputMode="decimal"
              readOnly={!canEdit}
              value={form.esi}
              onChange={(event) => set("esi", event.target.value)}
            />
          </Field>
          <Field id="salary-pf" label="PF" hint="Leave at 0 until you deduct this.">
            <input
              id="salary-pf"
              className="field"
              inputMode="decimal"
              readOnly={!canEdit}
              value={form.pf}
              onChange={(event) => set("pf", event.target.value)}
            />
          </Field>
          <Field id="salary-tax" label="Tax" hint="Leave at 0 until you deduct this.">
            <input
              id="salary-tax"
              className="field"
              inputMode="decimal"
              readOnly={!canEdit}
              value={form.tax}
              onChange={(event) => set("tax", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="card-site grid gap-4 p-6 sm:grid-cols-3 md:p-8">
        <div>
          <p className="text-sm text-muted-foreground">Gross</p>
          <p className="mt-1 text-xl font-semibold">{amountsReady ? inr(gross) : "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">ESI, PF, and tax</p>
          <p className="mt-1 text-xl font-semibold">{amountsReady ? inr(deductions) : "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Salary paid</p>
          <p className="mt-1 text-xl font-semibold">{amountsReady && netPay >= 0 ? inr(netPay) : "—"}</p>
        </div>
      </section>
    </form>
  );
}
