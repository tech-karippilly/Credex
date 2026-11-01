import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage, ApiError } from "@/lib/api";
import { expenseCategoriesApi } from "@/lib/expense-categories-api";
import { formatAmountInput, localCalendarDate, parseExpenseAmount } from "@/lib/expense-form";
import {
  fixedExpensesApi,
  type FixedExpense,
} from "@/lib/fixed-expenses-api";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));

function currentMonthValue(): string {
  const today = localCalendarDate();
  return today.slice(0, 7);
}

type FormState = {
  expenseName: string;
  categoryId: string;
  paidBy: string;
  amount: string;
  dayOfMonth: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  expenseName: "",
  categoryId: "",
  paidBy: "",
  amount: "",
  dayOfMonth: "1",
  notes: "",
});

export function FixedExpensesPanel() {
  const can = useCan();
  const [rows, setRows] = useState<FixedExpense[] | null>(null);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [generateMonth, setGenerateMonth] = useState(currentMonthValue);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fixedExpensesApi
      .list()
      .then((result) => {
        setRows(result.items);
        setTotalMonthly(result.totalMonthlyAmount);
      })
      .catch(() => {
        setRows([]);
        setTotalMonthly(0);
      });
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    expenseCategoriesApi
      .listActive()
      .then((items) => setCategories(items.map((item) => ({ id: item.id, name: item.name }))))
      .catch(() => setCategories([]));
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setModal("add");
    setMsg(null);
  }

  function openEdit(row: FixedExpense) {
    setEditing(row);
    setForm({
      expenseName: row.expenseName,
      categoryId: row.categoryId,
      paidBy: row.paidBy,
      amount: formatAmountInput(row.amount),
      dayOfMonth: String(row.dayOfMonth),
      notes: row.notes,
    });
    setModal("edit");
    setMsg(null);
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(emptyForm());
  }

  function validateForm(): string | null {
    if (!form.expenseName.trim()) return "Expense name is required.";
    if (!form.categoryId) return "Category is required.";
    if (!form.paidBy.trim()) return "Paid by is required.";
    const amount = parseExpenseAmount(form.amount);
    if (!amount.ok) return amount.message;
    const day = Number(form.dayOfMonth);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      return "Day of month must be between 1 and 28.";
    }
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setMsg({ ok: false, text: error });
      return;
    }
    const amount = parseExpenseAmount(form.amount);
    if (!amount.ok) return;

    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        expenseName: form.expenseName.trim(),
        categoryId: form.categoryId,
        paidBy: form.paidBy.trim(),
        amount: amount.amount,
        dayOfMonth: Number(form.dayOfMonth),
        notes: form.notes.trim() || undefined,
      };
      if (modal === "add") {
        await fixedExpensesApi.create(payload);
      } else if (editing) {
        await fixedExpensesApi.update(editing.id, payload);
      }
      closeModal();
      load();
      setMsg({ ok: true, text: "Fixed expense saved." });
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, "Could not save fixed expense.") });
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(row: FixedExpense) {
    setMsg(null);
    try {
      await fixedExpensesApi.updateStatus(row.id, !row.isActive);
      load();
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, "Could not update status.") });
    }
  }

  async function remove(row: FixedExpense) {
    if (!confirm(`Delete fixed expense "${row.expenseName}"?`)) return;
    setMsg(null);
    try {
      await fixedExpensesApi.delete(row.id);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setMsg({
          ok: false,
          text: "This fixed expense cannot be deleted because expenses were already generated from it. Disable it instead.",
        });
        return;
      }
      setMsg({ ok: false, text: apiErrorMessage(err, "Could not delete fixed expense.") });
    }
  }

  async function generate() {
    if (!/^\d{4}-\d{2}$/.test(generateMonth)) {
      setMsg({ ok: false, text: "Choose a valid month." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const result = await fixedExpensesApi.generate(generateMonth);
      const created = result.created.length;
      const skipped = result.skipped.length;
      setMsg({
        ok: true,
        text:
          created === 0 && skipped === 0
            ? `No active fixed expenses to generate for ${generateMonth}.`
            : `Generated ${created} expense${created === 1 ? "" : "s"} for ${generateMonth}` +
              (skipped > 0 ? ` (${skipped} skipped — already exist or could not create).` : "."),
      });
    } catch (err) {
      setMsg({ ok: false, text: apiErrorMessage(err, "Could not generate expenses.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Fixed Expenses</h1>
          <p className="mt-2 text-muted-foreground">
            Recurring monthly costs. Generate expense records each month, then use vouchers and payments as usual.
          </p>
          {rows !== null && (
            <p className="mt-1 text-sm text-muted-foreground">
              Active monthly total: <span className="font-medium text-foreground">{inr(totalMonthly)}</span>
            </p>
          )}
        </div>
        {can("fixed_expenses.create") && (
          <button type="button" onClick={openAdd} className="btn btn-primary shrink-0">
            <Plus className="h-4 w-4" />
            Add fixed expense
          </button>
        )}
      </div>

      {msg && (
        <p role="status" className={`mb-4 text-sm ${msg.ok ? "text-success" : "text-destructive"}`}>
          {msg.text}
        </p>
      )}

      {can("fixed_expenses.generate") && can("expenses.create") && (
        <div className="card-site mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="fx-month" className="mb-2 block text-sm font-semibold">
              Generate expenses for month
            </label>
            <input
              id="fx-month"
              type="month"
              className="field h-9"
              value={generateMonth}
              onChange={(event) => setGenerateMonth(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-outline h-9"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            Create expense records
          </button>
        </div>
      )}

      {rows === null ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">
          No fixed expenses yet. Add rent, subscriptions, and other monthly costs here.
        </div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Paid by</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-center">Day</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{row.expenseName}</td>
                  <td className="p-4">{row.category.name}</td>
                  <td className="p-4">{row.paidBy}</td>
                  <td className="p-4 text-right">{inr(row.amount)}</td>
                  <td className="p-4 text-center">{row.dayOfMonth}</td>
                  <td className="p-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      {can("fixed_expenses.update") && (
                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit fixed expense"
                          onClick={() => openEdit(row)}
                          className="btn btn-outline h-8 px-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {can("fixed_expenses.status.update") && (
                        <button
                          type="button"
                          className="btn btn-outline h-8 px-3 text-xs"
                          onClick={() => void toggleStatus(row)}
                        >
                          {row.isActive ? "Disable" : "Enable"}
                        </button>
                      )}
                      {can("fixed_expenses.delete") && (
                        <button
                          type="button"
                          title="Delete"
                          aria-label="Delete fixed expense"
                          onClick={() => void remove(row)}
                          className="btn btn-outline h-8 px-2 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fixed-expense-modal-title"
        >
          <form
            onSubmit={(e) => void save(e)}
            className="card-site max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
          >
            <h2 id="fixed-expense-modal-title" className="text-xl font-semibold">
              {modal === "add" ? "Add fixed expense" : "Edit fixed expense"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="fx-name" className="mb-2 block text-sm font-semibold">
                  Expense name
                </label>
                <input
                  id="fx-name"
                  className="field"
                  value={form.expenseName}
                  onChange={(e) => setForm((c) => ({ ...c, expenseName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="fx-cat" className="mb-2 block text-sm font-semibold">
                  Category
                </label>
                <select
                  id="fx-cat"
                  className="field"
                  value={form.categoryId}
                  onChange={(e) => setForm((c) => ({ ...c, categoryId: e.target.value }))}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="fx-paid" className="mb-2 block text-sm font-semibold">
                  Paid by
                </label>
                <input
                  id="fx-paid"
                  className="field"
                  value={form.paidBy}
                  onChange={(e) => setForm((c) => ({ ...c, paidBy: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fx-amount" className="mb-2 block text-sm font-semibold">
                    Amount (INR)
                  </label>
                  <input
                    id="fx-amount"
                    className="field"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fx-day" className="mb-2 block text-sm font-semibold">
                    Day of month (1–28)
                  </label>
                  <input
                    id="fx-day"
                    type="number"
                    min={1}
                    max={28}
                    className="field"
                    value={form.dayOfMonth}
                    onChange={(e) => setForm((c) => ({ ...c, dayOfMonth: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="fx-notes" className="mb-2 block text-sm font-semibold">
                  Notes
                </label>
                <textarea
                  id="fx-notes"
                  className="field min-h-[80px]"
                  value={form.notes}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
