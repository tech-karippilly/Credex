import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, Plus, Trash2, Download, Printer, Receipt, Upload, Pencil, Eye, Mail, MessageCircle } from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import { expensesApi, type Expense } from "@/lib/expenses-api";
import {
  vouchersApi,
  type PaymentMode,
  type Voucher,
  type VoucherStatus,
  type VoucherType,
} from "@/lib/vouchers-api";
import { company as COMPANY, LOGO_URL } from "@/lib/site";
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" });

function Head({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </div>
  );
}
function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>{children}</div>;
}
function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}

/* ---------------- expenses ---------------- */

export function ExpensesPanel({ onVoucher }: { onVoucher: (e: Expense) => void }) {
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const categoryId = filter === "All" ? undefined : filter;
    Promise.all([
      expensesApi.list({ limit: 100, categoryId }),
      expensesApi.listCategories(),
    ])
      .then(([list, cats]) => {
        setRows(list.items);
        setCategories(cats);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter]);
  useEffect(load, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form); const g = (k: string) => String(fd.get(k) ?? "");
    const f = { name: g("name"), categoryId: g("categoryId"), paid_by: g("paid_by"), amount: g("amount"), expense_date: g("expense_date"), notes: g("notes") };
    const amount = Number(f.amount);
    if (!f.name.trim() || !f.paid_by.trim() || !f.categoryId || !(amount > 0)) { setMsg("Please fill name, category, who paid and a valid amount."); return; }
    setBusy(true); setMsg(null);
    try {
      const created = await expensesApi.create({
        expenseName: f.name.trim(),
        categoryId: f.categoryId,
        paidBy: f.paid_by.trim(),
        amount,
        date: f.expense_date || new Date().toISOString().slice(0, 10),
        notes: f.notes.trim() || undefined,
      });
      if (file) {
        try {
          await expensesApi.uploadReceipt(created.id, file);
        } catch (uploadError) {
          await expensesApi.delete(created.id).catch(() => {});
          throw uploadError;
        }
      }
      form.reset(); setFile(null); setMsg("Expense saved."); load();
    } catch (error) {
      setMsg(apiErrorMessage(error, file ? "Receipt upload failed." : "Could not save expense."));
    } finally {
      setBusy(false);
    }
  }

  function openReceipt(url: string) {
    window.open(url, "_blank", "noopener");
  }
  async function del(x: Expense) {
    if (!confirm(`Delete expense "${x.expenseName}"?`)) return;
    try {
      await expensesApi.delete(x.id);
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Could not delete expense."));
    }
  }

  const shown = rows ?? [];
  const total = shown.reduce((s, r) => s + Number(r.amount), 0);
  const noCategories = categories.length === 0;

  return (
    <>
      <Head title="Expenses" text="Record company expenses with receipts." />
      {noCategories && (
        <div className="card-site mb-6 p-6 text-sm text-muted-foreground">
          No expense categories available. Create a category to add an expense.
        </div>
      )}
      <form onSubmit={add} className="card-site grid gap-5 p-6 md:grid-cols-2">
        <L id="x-name" label="Expense name *"><input id="x-name" name="name" className="field" placeholder="e.g. AWS hosting – October" /></L>
        <L id="x-cat" label="Category *">
          <select id="x-cat" name="categoryId" className="field" required disabled={noCategories} defaultValue={categories[0]?.id ?? ""}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </L>
        <L id="x-paid" label="Who paid *"><input id="x-paid" name="paid_by" className="field" placeholder="Person or Company account" /></L>
        <L id="x-amt" label="Amount (INR) *"><input id="x-amt" name="amount" type="number" step="0.01" min="0" className="field" /></L>
        <L id="x-date" label="Date"><input id="x-date" name="expense_date" type="date" className="field" defaultValue={new Date().toISOString().slice(0, 10)} /></L>
        <L id="x-rec" label="Receipt">
          <label htmlFor="x-rec" className="field flex cursor-pointer items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" /><span className="truncate text-muted-foreground">{file ? file.name : "Upload image or PDF (max 10 MB)"}</span>
            <input id="x-rec" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </L>
        <div className="md:col-span-2"><L id="x-notes" label="Notes"><textarea id="x-notes" name="notes" rows={2} className="field h-auto py-3" /></L></div>
        <div className="flex items-center gap-4 md:col-span-2">
          <button disabled={busy || noCategories} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add expense</button>
          {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </form>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter("All")} className={`btn h-9 px-4 text-sm ${filter === "All" ? "btn-primary" : "btn-outline"}`}>All</button>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setFilter(c.id)} className={`btn h-9 px-4 text-sm ${filter === c.id ? "btn-primary" : "btn-outline"}`}>{c.name}</button>
          ))}
        </div>
        <p className="text-sm">Total: <span className="font-semibold">{inr(total)}</span></p>
      </div>

      {loading ? <Spin /> : shown.length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">No expenses yet.</div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-4">Date</th><th className="p-4">Expense</th><th className="p-4">Category</th><th className="p-4">Paid by</th><th className="p-4 text-right">Amount</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{day(r.date)}</td>
                  <td className="p-4"><div className="font-medium">{r.expenseName}</div>{r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}</td>
                  <td className="p-4">{r.category.name}</td>
                  <td className="p-4">{r.paidBy}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(Number(r.amount))}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {r.receipt?.url && <button title="Receipt" aria-label="View receipt" onClick={() => openReceipt(r.receipt!.url)} className="btn btn-outline h-8 px-2"><Download className="h-4 w-4" /></button>}
                      <button title="Create voucher" aria-label="Create voucher" onClick={() => onVoucher(r)} className="btn btn-outline h-8 px-2"><Receipt className="h-4 w-4" /></button>
                      <button title="Delete" aria-label="Delete expense" onClick={() => del(r)} className="btn btn-outline h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
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

/* ---------------- vouchers ---------------- */

const VOUCHER_TYPES: { value: VoucherType; label: string }[] = [
  { value: "PAYMENT", label: "Payment" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "GENERAL", label: "General" },
];

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

const VOUCHER_STATUSES: { value: VoucherStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const emptyVoucherForm = () => ({
  voucherDate: new Date().toISOString().slice(0, 10),
  voucherType: "PAYMENT" as VoucherType,
  title: "",
  description: "",
  paidBy: "",
  payee: "",
  amount: "",
  paymentMode: "BANK_TRANSFER" as PaymentMode,
  categoryId: "",
  expenseId: "",
  referenceNumber: "",
  notes: "",
});

export type VoucherDraft = ReturnType<typeof emptyVoucherForm> & {
  expenseId: string;
};

export function VouchersPanel({ draft }: { draft: Partial<VoucherDraft> | null }) {
  const [rows, setRows] = useState<Voucher[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [form, setForm] = useState(emptyVoucherForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<VoucherType | "">("");
  const [filterStatus, setFilterStatus] = useState<VoucherStatus | "">("");
  const [shareModal, setShareModal] = useState<"email" | "whatsapp" | null>(null);
  const [shareVoucher, setShareVoucher] = useState<Voucher | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      vouchersApi.list({
        limit: 100,
        search: search.trim() || undefined,
        voucherType: filterType || undefined,
        status: filterStatus || undefined,
      }),
      expensesApi.listCategories(),
      expensesApi.list({ limit: 100 }),
    ])
      .then(([list, cats, expenseList]) => {
        setRows(list.items);
        setCategories(cats);
        setExpenses(expenseList.items);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [search, filterType, filterStatus]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!draft) return;
    setForm((prev) => ({
      ...prev,
      ...draft,
      expenseId: draft.expenseId ?? prev.expenseId,
      categoryId: draft.categoryId ?? prev.categoryId,
      amount: draft.amount ?? prev.amount,
    }));
    setEditingId(null);
    setEditingNumber(null);
  }, [draft]);

  function resetForm() {
    setForm(emptyVoucherForm());
    setEditingId(null);
    setEditingNumber(null);
    setFile(null);
  }

  function startEdit(voucher: Voucher) {
    setEditingId(voucher.id);
    setEditingNumber(voucher.voucherNumber);
    setFile(null);
    setForm({
      voucherDate: voucher.voucherDate,
      voucherType: voucher.voucherType,
      title: voucher.title,
      description: voucher.description,
      paidBy: voucher.paidBy,
      payee: voucher.payee,
      amount: String(voucher.amount),
      paymentMode: voucher.paymentMode,
      categoryId: voucher.categoryId ?? "",
      expenseId: voucher.expenseId ?? "",
      referenceNumber: voucher.referenceNumber,
      notes: voucher.notes,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (
      !form.title.trim() ||
      !form.paidBy.trim() ||
      !form.payee.trim() ||
      !(amount > 0)
    ) {
      setMsg("Please fill required fields and a valid amount.");
      return;
    }

    setBusy(true);
    setMsg(null);
    const payload = {
      voucherDate: form.voucherDate,
      voucherType: form.voucherType,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      paidBy: form.paidBy.trim(),
      payee: form.payee.trim(),
      amount,
      paymentMode: form.paymentMode,
      categoryId: form.categoryId || undefined,
      expenseId: form.expenseId || undefined,
      referenceNumber: form.referenceNumber.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editingId) {
        await vouchersApi.update(editingId, payload);
        if (file) await vouchersApi.uploadDocument(editingId, file);
        setMsg(`Voucher ${editingNumber ?? ""} updated.`);
        resetForm();
        load();
        return;
      }

      const created = await vouchersApi.create(payload);
      if (file) {
        try {
          await vouchersApi.uploadDocument(created.id, file);
        } catch (uploadError) {
          await vouchersApi.delete(created.id).catch(() => {});
          throw uploadError;
        }
      }
      setMsg(`Voucher ${created.voucherNumber} created.`);
      resetForm();
      load();
      printVoucher(created);
    } catch (error) {
      setMsg(apiErrorMessage(error, editingId ? "Could not update voucher." : "Could not create voucher."));
    } finally {
      setBusy(false);
    }
  }

  function openShareModal(voucher: Voucher, mode: "email" | "whatsapp") {
    setShareVoucher(voucher);
    setShareModal(mode);
    setShareEmail("");
    setSharePhone("");
    setShareMessage(
      mode === "email"
        ? "Please find the voucher attached."
        : "Please find the voucher details.",
    );
    setShareError("");
  }

  function closeShareModal() {
    setShareModal(null);
    setShareVoucher(null);
    setShareError("");
  }

  async function submitShare(e: React.FormEvent) {
    e.preventDefault();
    if (!shareVoucher || !shareModal || shareBusy) return;
    setShareBusy(true);
    setShareError("");
    try {
      if (shareModal === "email") {
        await vouchersApi.sendEmail(shareVoucher.id, {
          email: shareEmail.trim(),
          message: shareMessage.trim() || undefined,
        });
        setMsg(`Email sent for voucher ${shareVoucher.voucherNumber}.`);
      } else {
        await vouchersApi.sendWhatsapp(shareVoucher.id, {
          phone: sharePhone.trim(),
          message: shareMessage.trim() || undefined,
        });
        setMsg(`WhatsApp message sent for voucher ${shareVoucher.voucherNumber}.`);
      }
      closeShareModal();
    } catch (error) {
      setShareError(apiErrorMessage(error, "Could not send voucher."));
    } finally {
      setShareBusy(false);
    }
  }

  async function del(x: Voucher) {
    if (!confirm(`Delete voucher ${x.voucherNumber}?`)) return;
    try {
      await vouchersApi.delete(x.id);
      if (editingId === x.id) resetForm();
      load();
    } catch (error) {
      setMsg(apiErrorMessage(error, "Could not delete voucher."));
    }
  }

  function openDocument(url: string) {
    window.open(url, "_blank", "noopener");
  }

  const shown = rows ?? [];

  return (
    <>
      <Head title="Vouchers" text="Create payment vouchers when someone pays on behalf of the company." />

      <form onSubmit={submit} className="card-site grid gap-5 p-6 md:grid-cols-2">
        {editingNumber && (
          <p className="rounded-lg bg-secondary p-3 text-sm text-primary md:col-span-2">
            Editing voucher <span className="font-semibold">{editingNumber}</span>
          </p>
        )}
        {form.expenseId && !editingId && (
          <p className="rounded-lg bg-secondary p-3 text-sm text-primary md:col-span-2">
            Filled in from an expense. You can edit before creating.
          </p>
        )}
        <L id="v-date" label="Voucher date *">
          <input id="v-date" type="date" className="field" value={form.voucherDate} onChange={(e) => setForm({ ...form, voucherDate: e.target.value })} required />
        </L>
        <L id="v-type" label="Voucher type *">
          <select id="v-type" className="field" value={form.voucherType} onChange={(e) => setForm({ ...form, voucherType: e.target.value as VoucherType })}>
            {VOUCHER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </L>
        <L id="v-title" label="Title *">
          <input id="v-title" className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </L>
        <L id="v-mode" label="Payment mode *">
          <select id="v-mode" className="field" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value as PaymentMode })}>
            {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </L>
        <L id="v-paid" label="Paid by *">
          <input id="v-paid" className="field" value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} required />
        </L>
        <L id="v-payee" label="Payee *">
          <input id="v-payee" className="field" value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} required />
        </L>
        <L id="v-amt" label="Amount (INR) *">
          <input id="v-amt" type="number" step="0.01" min="0" className="field" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        </L>
        <L id="v-cat" label="Category">
          <select id="v-cat" className="field" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </L>
        <L id="v-exp" label="Expense">
          <select id="v-exp" className="field" value={form.expenseId} onChange={(e) => setForm({ ...form, expenseId: e.target.value })}>
            <option value="">None</option>
            {expenses.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.expenseName} — {day(ex.date)} — {inr(ex.amount)}</option>
            ))}
          </select>
        </L>
        <L id="v-ref" label="Reference number">
          <input id="v-ref" className="field" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} />
        </L>
        <L id="v-doc" label="Supporting document">
          <label htmlFor="v-doc" className="field flex cursor-pointer items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            <span className="truncate text-muted-foreground">{file ? file.name : "Upload image or PDF (max 10 MB)"}</span>
            <input id="v-doc" type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </L>
        <div className="md:col-span-2">
          <L id="v-desc" label="Description">
            <textarea id="v-desc" rows={2} className="field h-auto py-3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </L>
        </div>
        <div className="md:col-span-2">
          <L id="v-notes" label="Notes">
            <textarea id="v-notes" rows={2} className="field h-auto py-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </L>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <button disabled={busy} className="btn btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
            {editingId ? "Update voucher" : "Create voucher"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel edit</button>
          )}
          {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </form>

      <div className="mt-10 flex flex-wrap items-end gap-3">
        <L id="v-search" label="Search">
          <input id="v-search" className="field h-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Voucher no., title, payee…" />
        </L>
        <L id="v-ft" label="Type">
          <select id="v-ft" className="field h-9" value={filterType} onChange={(e) => setFilterType(e.target.value as VoucherType | "")}>
            <option value="">All types</option>
            {VOUCHER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </L>
        <L id="v-fs" label="Status">
          <select id="v-fs" className="field h-9" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as VoucherStatus | "")}>
            <option value="">All statuses</option>
            {VOUCHER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </L>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Issued vouchers</h2>
      {loading ? <Spin /> : shown.length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">No vouchers yet.</div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Voucher no.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Title</th>
                <th className="p-4">Paid by</th>
                <th className="p-4">Payee</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-semibold">{r.voucherNumber}</td>
                  <td className="whitespace-nowrap p-4">{day(r.voucherDate)}</td>
                  <td className="p-4">{r.voucherType}</td>
                  <td className="p-4"><div className="font-medium">{r.title}</div>{r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}</td>
                  <td className="p-4">{r.paidBy}</td>
                  <td className="p-4">{r.payee}</td>
                  <td className="p-4">{r.category?.name ?? "—"}</td>
                  <td className="p-4">{r.status}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(r.amount)}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {r.document?.url && (
                        <button title="View document" aria-label="View document" onClick={() => openDocument(r.document!.url)} className="btn btn-outline h-8 px-2">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button title="Send email" aria-label="Send email" onClick={() => openShareModal(r, "email")} className="btn btn-outline h-8 px-2"><Mail className="h-4 w-4" /></button>
                      <button title="Send WhatsApp" aria-label="Send WhatsApp" onClick={() => openShareModal(r, "whatsapp")} className="btn btn-outline h-8 px-2"><MessageCircle className="h-4 w-4" /></button>
                      <button title="Print" aria-label="Print voucher" onClick={() => printVoucher(r)} className="btn btn-outline h-8 px-2"><Printer className="h-4 w-4" /></button>
                      <button title="Edit" aria-label="Edit voucher" onClick={() => startEdit(r)} className="btn btn-outline h-8 px-2"><Pencil className="h-4 w-4" /></button>
                      <button title="Delete" aria-label="Delete voucher" onClick={() => del(r)} className="btn btn-outline h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shareModal && shareVoucher && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voucher-share-title"
        >
          <form
            onSubmit={submitShare}
            className="card-site w-full max-w-lg p-6"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="voucher-share-title" className="text-xl font-semibold">
              {shareModal === "email" ? "Send Email" : "Send WhatsApp"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Voucher {shareVoucher.voucherNumber}
            </p>
            <div className="mt-5 space-y-4">
              {shareModal === "email" ? (
                <div>
                  <label htmlFor="v-share-email" className="mb-2 block text-sm font-semibold">
                    Recipient email *
                  </label>
                  <input
                    id="v-share-email"
                    type="email"
                    className="field"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="v-share-phone" className="mb-2 block text-sm font-semibold">
                    Recipient phone number *
                  </label>
                  <input
                    id="v-share-phone"
                    type="tel"
                    className="field"
                    value={sharePhone}
                    onChange={(e) => setSharePhone(e.target.value)}
                    placeholder="+919876543210"
                    required
                    autoComplete="tel"
                  />
                </div>
              )}
              <div>
                <label htmlFor="v-share-msg" className="mb-2 block text-sm font-semibold">
                  Message
                </label>
                <textarea
                  id="v-share-msg"
                  rows={3}
                  className="field h-auto py-3"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={closeShareModal} disabled={shareBusy} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={shareBusy} className="btn btn-primary">
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {shareModal === "email" ? "Send Email" : "Send WhatsApp"}
              </button>
            </div>
            {shareError && (
              <p role="status" className="mt-3 text-sm text-destructive">{shareError}</p>
            )}
          </form>
        </div>
      )}
    </>
  );
}

/* ---------------- printable voucher ---------------- */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function words(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) => (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? " " + a[x % 10] : ""}`)!;
  const three = (x: number) => `${x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " : "") : ""}${x % 100 ? two(x % 100) : ""}`;
  if (n === 0) return "Zero";
  let out = ""; const cr = Math.floor(n / 1e7); n %= 1e7; const lk = Math.floor(n / 1e5); n %= 1e5; const th = Math.floor(n / 1000); n %= 1000;
  if (cr) out += three(cr) + " Crore "; if (lk) out += two(lk) + " Lakh "; if (th) out += two(th) + " Thousand "; if (n) out += three(n);
  return out.trim();
}

function paymentModeLabel(mode: PaymentMode): string {
  return PAYMENT_MODES.find((m) => m.value === mode)?.label ?? mode;
}

export function printVoucher(v: Voucher) {
  const amt = Number(v.amount);
  const rupees = Math.floor(amt); const paise = Math.round((amt - rupees) * 100);
  const inWords = `Rupees ${words(rupees)}${paise ? ` and ${words(paise)} Paise` : ""} Only`;
  const particulars = v.description || v.title;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("Please allow pop-ups to print the voucher."); return; }
  w.document.write(`<!doctype html><html><head><title>Voucher ${v.voucherNumber}</title><style>
  body{font-family:Arial,Helvetica,sans-serif;color:#00142B;margin:40px}
  .box{border:2px solid #003C82;padding:32px;max-width:720px;margin:auto}
  .hdr{display:flex;align-items:center;gap:20px;margin-bottom:4px}
  .logo{height:72px;width:auto;max-width:140px;object-fit:contain}
  h1{margin:0;color:#003C82;font-size:22px} .sub{font-size:12px;color:#555}
  .title{text-align:center;letter-spacing:4px;font-weight:bold;margin:24px 0;padding:8px;background:#F6F9FB;border:1px solid #ddd}
  .row{display:flex;justify-content:space-between;margin:6px 0;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
  td,th{border:1px solid #ccc;padding:10px;text-align:left} th{background:#F6F9FB}
  .r{text-align:right} .sig{display:flex;justify-content:space-between;margin-top:70px;font-size:13px}
  .sig div{border-top:1px solid #00142B;padding-top:6px;width:30%;text-align:center}
  @media print{body{margin:0}}
  </style></head><body><div class="box">
  <div class="hdr"><img class="logo" src="${esc(LOGO_URL)}" alt="${esc(COMPANY.brand)} logo" /><div><h1>${esc(COMPANY.legalName)}</h1><div class="sub">${esc("CIN: " + COMPANY.cin + " · " + COMPANY.location)}</div></div></div>
  <div class="title">PAYMENT VOUCHER</div>
  <div class="row"><span><b>Voucher No:</b> ${esc(v.voucherNumber)}</span><span><b>Date:</b> ${esc(day(v.voucherDate))}</span></div>
  <div class="row"><span><b>Paid by:</b> ${esc(v.paidBy)}</span><span><b>Payee:</b> ${esc(v.payee)}</span></div>
  <div class="row"><span><b>Mode:</b> ${esc(paymentModeLabel(v.paymentMode))}</span></div>
  <table><tr><th>Particulars</th><th class="r">Amount (INR)</th></tr>
  <tr><td>${esc(particulars || "-")}</td><td class="r">${esc(inr(amt))}</td></tr>
  <tr><th>Total</th><th class="r">${esc(inr(amt))}</th></tr></table>
  <p style="font-size:14px;margin-top:16px"><b>Amount in words:</b> ${esc(inWords)}</p>
  <div class="sig"><div>Prepared by</div><div>Approved by</div><div>Receiver's signature</div></div>
  </div><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
  w.document.close();
}
