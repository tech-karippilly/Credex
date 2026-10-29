import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, Loader2, Pencil, Plus, Receipt, Trash2, Upload } from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import {
  clampPage,
  dateRangeError,
  formatAmountInput,
  formatLedgerDate,
  localCalendarDate,
  parseExpenseAmount,
  receiptFileError,
} from "@/lib/expense-form";
import {
  expenseInvoiceDate,
  expensesApi,
  type Expense,
  type ExpenseCategory,
  type ExpenseReceipt,
  type ExpenseVoucherCounts,
  type ExpenseVoucherStatus,
} from "@/lib/expenses-api";
import { useCan } from "./admin-access";
import { LedgerPagination } from "./ledger-pagination";
import { ReceiptPreviewModal } from "./receipt-preview";

export { VouchersPanel, type VoucherDraft } from "./vouchers-panel";

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));
function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>{children}</div>;
}
function Spin() {
  return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
}
function formatRecordedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/* ---------------- expenses ---------------- */

type ExpenseDraft = {
  expenseName: string;
  categoryId: string;
  paidBy: string;
  amount: string;
  invoiceDate: string;
  receivedDate: string;
  notes: string;
};

type ExpenseField =
  | "expenseName"
  | "categoryId"
  | "paidBy"
  | "amount"
  | "invoiceDate"
  | "receivedDate"
  | "receipt";

function emptyExpenseDraft(): ExpenseDraft {
  return {
    expenseName: "",
    categoryId: "",
    paidBy: "",
    amount: "",
    invoiceDate: localCalendarDate(),
    receivedDate: "",
    notes: "",
  };
}

function validateExpenseDraft(
  draft: ExpenseDraft,
  file: File | null,
): Partial<Record<ExpenseField, string>> {
  const errors: Partial<Record<ExpenseField, string>> = {};
  if (!draft.expenseName.trim()) errors.expenseName = "Expense name is required.";
  if (!draft.categoryId) errors.categoryId = "Category is required.";
  if (!draft.paidBy.trim()) errors.paidBy = "Paid by is required.";
  const amount = parseExpenseAmount(draft.amount);
  if (!amount.ok) errors.amount = amount.message;
  if (!draft.invoiceDate) errors.invoiceDate = "Invoice date is required.";
  if (file) {
    const receiptError = receiptFileError(file);
    if (receiptError) errors.receipt = receiptError;
  }
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-destructive">{message}</p>;
}

function expenseVoucherLabel(status: ExpenseVoucherStatus | undefined): string {
  return status === "VOUCHERED" ? "Vouchered" : "Not vouchered";
}

function primaryVoucherNumber(expense: Expense): string | null {
  return expense.vouchers?.[0]?.voucherNumber ?? null;
}

export function ExpensesPanel({
  onVoucher,
  onOpenVoucher,
}: {
  onVoucher: (e: Expense) => void;
  onOpenVoucher?: (voucherNumber: string) => void;
}) {
  const can = useCan();
  const [rows, setRows] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [categoryId, setCategoryId] = useState("");
  const [voucherStatus, setVoucherStatus] = useState<ExpenseVoucherStatus | "">("");
  const [dateDraft, setDateDraft] = useState({ from: "", to: "" });
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [voucherCounts, setVoucherCounts] = useState<ExpenseVoucherCounts>({
    all: 0,
    notVouchered: 0,
    vouchered: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [reloadToken, setReloadToken] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ExpenseField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [existingReceipt, setExistingReceipt] = useState<Expense["receipt"]>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<ExpenseReceipt | null>(null);
  const saveLock = useRef(false);

  const refreshList = useCallback(() => setReloadToken((token) => token + 1), []);

  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    expensesApi.listCategories()
      .then(setCategories)
      .catch((error) => {
        setCategories([]);
        setCategoriesError(apiErrorMessage(error, "Could not load categories."));
      })
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    let cancelled = false;
    let redirecting = false;
    setLoading(true);
    setListError(null);
    expensesApi.list({
      page,
      limit,
      categoryId: categoryId || undefined,
      from: appliedFrom || undefined,
      to: appliedTo || undefined,
      voucherStatus: voucherStatus || undefined,
    })
      .then((list) => {
        if (cancelled) return;
        const nextPage = clampPage(page, list.pagination.totalPages);
        if (nextPage !== page) {
          redirecting = true;
          setPage(nextPage);
          return;
        }
        setRows(list.items);
        setTotalAmount(list.totalAmount);
        setVoucherCounts(
          list.voucherCounts ?? {
            all: list.pagination.total,
            notVouchered: 0,
            vouchered: 0,
          },
        );
        setPagination(list.pagination);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows(null);
        setListError(apiErrorMessage(error, "Could not load expenses."));
      })
      .finally(() => {
        if (!cancelled && !redirecting) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, categoryId, voucherStatus, appliedFrom, appliedTo, reloadToken]);

  function applyDateFilters() {
    const rangeError = dateRangeError(dateDraft.from, dateDraft.to);
    if (rangeError) {
      setFilterError(rangeError);
      return;
    }
    setFilterError(null);
    setNotice(null);
    setAppliedFrom(dateDraft.from);
    setAppliedTo(dateDraft.to);
    setPage(1);
  }

  function clearFilters() {
    setDateDraft({ from: "", to: "" });
    setAppliedFrom("");
    setAppliedTo("");
    setCategoryId("");
    setVoucherStatus("");
    setFilterError(null);
    setNotice(null);
    setPage(1);
  }

  function canCreateVoucher(expense: Expense): boolean {
    if (expense.remainingEligibleAmount != null) {
      return expense.remainingEligibleAmount > 0;
    }
    return expense.voucherStatus !== "VOUCHERED";
  }

  function resetExpenseEditor() {
    setEditingId(null);
    setEditingCreatedAt(null);
    setExistingReceipt(null);
    setRemoveReceipt(false);
    setEditingCategory(null);
    setDraft(emptyExpenseDraft());
    setFile(null);
    setFieldErrors({});
    setFormError(null);
  }

  function openForm() {
    resetExpenseEditor();
    setNotice(null);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id);
    setEditingCreatedAt(expense.createdAt);
    setExistingReceipt(expense.receipt);
    setRemoveReceipt(false);
    setEditingCategory(expense.category);
    setDraft({
      expenseName: expense.expenseName,
      categoryId: expense.categoryId,
      paidBy: expense.paidBy,
      amount: formatAmountInput(expense.amount),
      invoiceDate: expenseInvoiceDate(expense).slice(0, 10),
      receivedDate: expense.receivedDate?.slice(0, 10) ?? "",
      notes: expense.notes ?? "",
    });
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    resetExpenseEditor();
  }

  function chooseReceipt(next: File | null) {
    setFile(next);
    if (next) setRemoveReceipt(false);
    setFieldErrors((current) => ({
      ...current,
      receipt: next ? receiptFileError(next) ?? undefined : undefined,
    }));
  }

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    if (busy || saveLock.current) return;
    const errors = validateExpenseDraft(draft, file);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const amount = parseExpenseAmount(draft.amount);
    if (!amount.ok) return;

    const payload = {
      expenseName: draft.expenseName.trim(),
      categoryId: draft.categoryId,
      paidBy: draft.paidBy.trim(),
      amount: amount.amount,
      invoiceDate: draft.invoiceDate,
      date: draft.invoiceDate,
      receivedDate: draft.receivedDate || null,
      notes: editingId ? draft.notes.trim() : draft.notes.trim() || undefined,
    };
    const receiptFile = file;
    const shouldRemoveReceipt = Boolean(editingId && removeReceipt && existingReceipt && !receiptFile);
    const expenseId = editingId;

    saveLock.current = true;
    setBusy(true);
    try {
      if (expenseId) {
        await expensesApi.update(expenseId, payload);
        try {
          if (receiptFile) {
            await expensesApi.uploadReceipt(expenseId, receiptFile);
          } else if (shouldRemoveReceipt) {
            await expensesApi.deleteReceipt(expenseId);
          }
        } catch (receiptError) {
          closeForm();
          setNotice({
            ok: false,
            text: receiptFile
              ? `Expense updated, but the receipt could not be replaced. The other changes were saved, and the previous receipt was kept. ${apiErrorMessage(receiptError, "Receipt upload failed.")}`
              : `Expense updated, but the receipt could not be removed. The other changes were saved. ${apiErrorMessage(receiptError, "Receipt removal failed.")}`,
          });
          refreshList();
          return;
        }
        closeForm();
        setNotice({ ok: true, text: "Expense updated." });
        refreshList();
        return;
      }

      const created = await expensesApi.create(payload);
      if (receiptFile) {
        try {
          await expensesApi.uploadReceipt(created.id, receiptFile);
        } catch (uploadError) {
          closeForm();
          setNotice({
            ok: false,
            text: `Expense saved, but the receipt could not be uploaded. The expense was kept without a receipt. ${apiErrorMessage(uploadError, "Receipt upload failed.")}`,
          });
          refreshList();
          return;
        }
      }
      closeForm();
      setNotice({ ok: true, text: "Expense saved." });
      refreshList();
    } catch (error) {
      setFormError(apiErrorMessage(error, expenseId ? "Could not update expense." : "Could not save expense."));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  function openReceipt(receipt: ExpenseReceipt | null | undefined) {
    if (!receipt?.url) {
      setNotice({ ok: false, text: "This expense has no receipt file." });
      return;
    }
    setPreviewReceipt(receipt);
  }

  async function del(expense: Expense) {
    if (!confirm(`Delete expense "${expense.expenseName}"?`)) return;
    setNotice(null);
    try {
      await expensesApi.delete(expense.id);
      setNotice({ ok: true, text: "Expense deleted." });
      refreshList();
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not delete expense.") });
    }
  }

  const filtersActive = Boolean(categoryId || appliedFrom || appliedTo || voucherStatus);
  const recordLabel = `${pagination.total} expense ${pagination.total === 1 ? "record" : "records"} match the current filters.`;

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Expenses</h1>
          <p className="mt-2 text-muted-foreground">
            {listError
              ? "Expense records could not be loaded."
              : loaded
                ? recordLabel
                : "Loading expenses…"}
          </p>
        </div>
        {can("expenses.create") && (
        <button type="button" className="btn btn-primary shrink-0" onClick={openForm}>
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
        )}
      </div>

      {notice && (
        <p role="status" className={`mb-4 text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <L id="x-from" label="From invoice date">
          <input id="x-from" type="date" className="field h-9" value={dateDraft.from} onChange={(event) => setDateDraft((current) => ({ ...current, from: event.target.value }))} />
        </L>
        <L id="x-to" label="To invoice date">
          <input id="x-to" type="date" className="field h-9" value={dateDraft.to} onChange={(event) => setDateDraft((current) => ({ ...current, to: event.target.value }))} />
        </L>
        <L id="x-filter-cat" label="Category">
          <select
            id="x-filter-cat"
            className="field h-9"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setNotice(null);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </L>
        <L id="x-voucher-status" label="Voucher status">
          <select
            id="x-voucher-status"
            className="field h-9"
            value={voucherStatus}
            onChange={(event) => {
              setVoucherStatus(event.target.value as ExpenseVoucherStatus | "");
              setNotice(null);
              setPage(1);
            }}
          >
            <option value="">All expenses</option>
            <option value="NOT_VOUCHERED">Not vouchered</option>
            <option value="VOUCHERED">Vouchered</option>
          </select>
        </L>
        <button type="button" className="btn btn-primary h-9" onClick={applyDateFilters}>Apply filters</button>
        <button type="button" className="btn btn-outline h-9" onClick={clearFilters}>Clear filters</button>
      </div>
      {filterError && <p className="mt-2 text-sm text-destructive">{filterError}</p>}
      {categoriesError && (
        <p className="mt-2 text-sm text-destructive">
          {categoriesError}{" "}
          <button type="button" className="font-semibold underline" onClick={loadCategories}>Retry</button>
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">All expenses</p>
          <p className="mt-1 text-xl font-semibold">{loaded && !listError ? voucherCounts.all : "—"}</p>
        </div>
        <div className="rounded-lg border border-border px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Not vouchered</p>
          <p className="mt-1 text-xl font-semibold">{loaded && !listError ? voucherCounts.notVouchered : "—"}</p>
        </div>
        <div className="rounded-lg border border-border px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Vouchered</p>
          <p className="mt-1 text-xl font-semibold">{loaded && !listError ? voucherCounts.vouchered : "—"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm">
          Filtered total{" "}
          <span className="font-semibold">{loaded && !listError ? inr(totalAmount) : "—"}</span>
          <span className="mt-1 block text-xs text-muted-foreground">All expenses matching the current filters, not only this page.</span>
        </p>
      </div>

      {loading ? <Spin /> : listError ? (
        <div className="card-site mt-4 p-10 text-center" role="alert">
          <p className="text-destructive">{listError}</p>
          <button type="button" className="btn btn-outline mt-4" onClick={refreshList}>Retry</button>
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">
          {filtersActive ? "No expenses match the selected filters." : "No expenses yet."}
        </div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Invoice date</th>
                <th className="p-4">Expense Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Paid By</th>
                <th className="p-4 text-right">Amount (₹)</th>
                <th className="p-4">Voucher status</th>
                <th className="p-4">Voucher</th>
                <th className="p-4">Receipt</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((expense) => {
                const voucherNumber = primaryVoucherNumber(expense);
                const allowVoucher = canCreateVoucher(expense);
                return (
                <tr key={expense.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{formatLedgerDate(expenseInvoiceDate(expense))}</td>
                  <td className="p-4 font-medium">{expense.expenseName}</td>
                  <td className="p-4">{expense.category.name}</td>
                  <td className="p-4">{expense.paidBy}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(Number(expense.amount))}</td>
                  <td className="p-4">{expenseVoucherLabel(expense.voucherStatus)}</td>
                  <td className="p-4">
                    {voucherNumber ? (
                      onOpenVoucher ? (
                        <button
                          type="button"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                          onClick={() => onOpenVoucher(voucherNumber)}
                        >
                          {voucherNumber}
                        </button>
                      ) : (
                        <span className="font-medium">{voucherNumber}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {expense.vouchers && expense.vouchers.length > 1 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        +{expense.vouchers.length - 1} more
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {expense.receipt?.url ? (
                      <button
                        type="button"
                        className="btn btn-outline h-8 px-3 text-sm"
                        onClick={() => openReceipt(expense.receipt)}
                      >
                        <Eye className="h-4 w-4" />
                        View Receipt
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      {can("expenses.update") && <button type="button" title="Edit" aria-label="Edit expense" onClick={() => openEdit(expense)} className="btn btn-outline h-8 px-2"><Pencil className="h-4 w-4" /></button>}
                      {can("vouchers.create") && allowVoucher && (
                        <button
                          type="button"
                          title="Create voucher"
                          aria-label="Create voucher"
                          onClick={() => onVoucher(expense)}
                          className="btn btn-outline h-8 px-2"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                      )}
                      {can("expenses.delete") && <button type="button" title="Delete" aria-label="Delete expense" onClick={() => del(expense)} className="btn btn-outline h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {loaded && !listError && (
        <LedgerPagination
          pageSizeId="x-page-size"
          page={page}
          totalPages={pagination.totalPages}
          limit={limit}
          loading={loading}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next);
            setPage(1);
          }}
        />
      )}

      {previewReceipt && (
        <ReceiptPreviewModal receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />
      )}

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => { if (!busy) closeForm(); }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-form-title"
            className="card-site max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) closeForm();
            }}
            onSubmit={saveExpense}
          >
            <h2 id="expense-form-title" className="text-xl font-semibold">{editingId ? "Edit Expense" : "Add Expense"}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <L id="exp-name" label="Expense name *">
                  <input
                    id="exp-name"
                    className="field"
                    value={draft.expenseName}
                    aria-invalid={Boolean(fieldErrors.expenseName)}
                    aria-describedby={fieldErrors.expenseName ? "exp-name-error" : undefined}
                    onChange={(event) => setDraft({ ...draft, expenseName: event.target.value })}
                  />
                </L>
                <FieldError id="exp-name-error" message={fieldErrors.expenseName} />
              </div>
              <div>
                <L id="exp-cat" label="Category *">
                  <select
                    id="exp-cat"
                    className="field"
                    value={draft.categoryId}
                    disabled={categoriesLoading || (categories.length === 0 && !draft.categoryId)}
                    aria-invalid={Boolean(fieldErrors.categoryId)}
                    aria-describedby={fieldErrors.categoryId ? "exp-cat-error" : undefined}
                    onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
                  >
                    <option value="">Select a category</option>
                    {editingCategory && !categories.some((category) => category.id === editingCategory.id) && (
                      <option value={editingCategory.id}>{editingCategory.name}</option>
                    )}
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </L>
                <FieldError id="exp-cat-error" message={fieldErrors.categoryId} />
              </div>
              <div>
                <L id="exp-paid" label="Paid by *">
                  <input
                    id="exp-paid"
                    className="field"
                    value={draft.paidBy}
                    aria-invalid={Boolean(fieldErrors.paidBy)}
                    aria-describedby={fieldErrors.paidBy ? "exp-paid-error" : undefined}
                    onChange={(event) => setDraft({ ...draft, paidBy: event.target.value })}
                  />
                </L>
                <FieldError id="exp-paid-error" message={fieldErrors.paidBy} />
              </div>
              <div>
                <L id="exp-amt" label="Amount (₹) *">
                  <input
                    id="exp-amt"
                    className="field"
                    inputMode="decimal"
                    value={draft.amount}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? "exp-amt-error" : undefined}
                    onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                  />
                </L>
                <FieldError id="exp-amt-error" message={fieldErrors.amount} />
              </div>
              <div>
                <L id="exp-invoice-date" label="Invoice date *">
                  <input
                    id="exp-invoice-date"
                    type="date"
                    className="field"
                    value={draft.invoiceDate}
                    aria-invalid={Boolean(fieldErrors.invoiceDate)}
                    aria-describedby={fieldErrors.invoiceDate ? "exp-invoice-date-error" : "exp-invoice-date-hint"}
                    onChange={(event) => setDraft({ ...draft, invoiceDate: event.target.value })}
                  />
                </L>
                <p id="exp-invoice-date-hint" className="mt-1 text-xs text-muted-foreground">
                  Date printed on the supplier invoice. Independent of when the record is saved.
                </p>
                <FieldError id="exp-invoice-date-error" message={fieldErrors.invoiceDate} />
              </div>
              <div>
                <L id="exp-received-date" label="Received date">
                  <input
                    id="exp-received-date"
                    type="date"
                    className="field"
                    value={draft.receivedDate}
                    aria-invalid={Boolean(fieldErrors.receivedDate)}
                    aria-describedby={fieldErrors.receivedDate ? "exp-received-date-error" : "exp-received-date-hint"}
                    onChange={(event) => setDraft({ ...draft, receivedDate: event.target.value })}
                  />
                </L>
                <p id="exp-received-date-hint" className="mt-1 text-xs text-muted-foreground">
                  Optional. When the company received the invoice.
                </p>
                <FieldError id="exp-received-date-error" message={fieldErrors.receivedDate} />
              </div>
              {editingId && editingCreatedAt && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recorded</p>
                  <p className="text-sm text-muted-foreground">{formatRecordedAt(editingCreatedAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">System entry time. Not editable.</p>
                </div>
              )}
              <div>
                <L id="exp-receipt" label="Receipt">
                  <label htmlFor="exp-receipt" className="field flex cursor-pointer items-center gap-2 text-sm">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="truncate text-muted-foreground">
                      {file
                        ? file.name
                        : removeReceipt
                          ? "Receipt will be removed"
                          : existingReceipt
                            ? "Replace the current receipt"
                            : "JPEG, PNG, or PDF (max 10 MB)"}
                    </span>
                    <input
                      id="exp-receipt"
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png,.pdf,application/pdf"
                      className="sr-only"
                      aria-invalid={Boolean(fieldErrors.receipt)}
                      aria-describedby={fieldErrors.receipt ? "exp-receipt-error" : undefined}
                      onChange={(event) => chooseReceipt(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </L>
                <FieldError id="exp-receipt-error" message={fieldErrors.receipt} />
                {editingId && existingReceipt && !file && !removeReceipt && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Current receipt: {existingReceipt.fileName}</span>
                    <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => openReceipt(existingReceipt)}>View Receipt</button>
                    <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => setRemoveReceipt(true)}>Remove receipt</button>
                  </div>
                )}
                {editingId && removeReceipt && !file && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The current receipt will be removed when you save.{" "}
                    <button type="button" className="font-semibold underline" onClick={() => setRemoveReceipt(false)}>Keep receipt</button>
                  </p>
                )}
                {editingId && file && existingReceipt && (
                  <p className="mt-2 text-sm text-muted-foreground">This file replaces {existingReceipt.fileName}.</p>
                )}
              </div>
              <div className="md:col-span-2">
                <L id="exp-notes" label="Notes">
                  <textarea id="exp-notes" rows={2} className="field h-auto py-3" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
                </L>
              </div>
            </div>
            {!categoriesLoading && categories.length === 0 && !categoriesError && !draft.categoryId && (
              <p className="mt-4 text-sm text-muted-foreground">No expense categories available. Create a category before adding an expense.</p>
            )}
            {categoriesError && <p className="mt-4 text-sm text-destructive">{categoriesError}</p>}
            {formError && <p role="alert" className="mt-4 text-sm text-destructive">{formError}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline" disabled={busy} onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy || categoriesLoading || (categories.length === 0 && !draft.categoryId)}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Save Changes" : "Save expense"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

