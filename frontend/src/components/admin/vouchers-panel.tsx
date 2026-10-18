import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Trash2,
  Upload,
} from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import {
  clampPage,
  dateRangeError,
  formatAmountInput,
  formatLedgerDate,
  localCalendarDate,
  parseExpenseAmount,
} from "@/lib/expense-form";
import { expensesApi, type Expense } from "@/lib/expenses-api";
import { paymentsApi, type PaymentListItem } from "@/lib/payments-api";
import { company as COMPANY, LOGO_URL } from "@/lib/site";
import {
  vouchersApi,
  type PaymentMode,
  type UpdateVoucherRequest,
  type Voucher,
  type VoucherStatus,
  type VoucherType,
} from "@/lib/vouchers-api";
import { LedgerPagination } from "./ledger-pagination";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));

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

type VoucherFormState = {
  voucherDate: string;
  voucherType: VoucherType;
  title: string;
  description: string;
  paidBy: string;
  payee: string;
  amount: string;
  paymentMode: PaymentMode;
  categoryId: string;
  expenseId: string;
  referenceNumber: string;
  notes: string;
  status: VoucherStatus;
};

export type VoucherDraft = VoucherFormState;

function emptyVoucherForm(): VoucherFormState {
  return {
    voucherDate: localCalendarDate(),
    voucherType: "PAYMENT",
    title: "",
    description: "",
    paidBy: "",
    payee: "",
    amount: "",
    paymentMode: "BANK_TRANSFER",
    categoryId: "",
    expenseId: "",
    referenceNumber: "",
    notes: "",
    status: "COMPLETED",
  };
}

type VoucherField = "voucherDate" | "title" | "paidBy" | "payee" | "amount";

function validateVoucherForm(form: VoucherFormState): Partial<Record<VoucherField, string>> {
  const errors: Partial<Record<VoucherField, string>> = {};
  if (!form.voucherDate) errors.voucherDate = "Voucher date is required.";
  if (!form.title.trim()) errors.title = "Title is required.";
  if (!form.paidBy.trim()) errors.paidBy = "Paid by is required.";
  if (!form.payee.trim()) errors.payee = "Payee is required.";
  const amount = parseExpenseAmount(form.amount);
  if (!amount.ok) errors.amount = amount.message;
  return errors;
}

function voucherStatusLabel(status: string): string {
  return VOUCHER_STATUSES.find((item) => item.value === status)?.label ?? status;
}

function voucherTypeLabel(type: string): string {
  return VOUCHER_TYPES.find((item) => item.value === type)?.label ?? type;
}

function paymentModeLabel(mode: string): string {
  return PAYMENT_MODES.find((item) => item.value === mode)?.label ?? mode;
}

function settlementLabel(status: string): string {
  if (status === "PARTIALLY_PAID") return "Partially paid";
  if (status === "PAID") return "Paid";
  return "Unpaid";
}

function referenceLabel(mode: PaymentMode): string {
  if (mode === "CHEQUE") return "Cheque number";
  if (mode === "BANK_TRANSFER") return "Transaction reference / UTR";
  if (mode === "CASH") return "Cash reference";
  return "Reference number";
}

function referenceHint(mode: PaymentMode): string | null {
  if (mode === "CHEQUE") {
    return "Cheque date and the issuing account are stored on the payment. An issued cheque is not treated as cleared funds.";
  }
  if (mode === "BANK_TRANSFER") {
    return "NEFT, RTGS, or IMPS, together with the bank account, are stored when a payment is allocated to this voucher.";
  }
  return null;
}

function paise(amount: number): number {
  return Math.round(amount * 100);
}

function voucherHasAllocations(voucher: Voucher): boolean {
  const amount = paise(voucher.amount);
  const paid = paise(voucher.amountPaid ?? 0);
  const available = paise(voucher.availableToAllocate ?? voucher.amount);
  return paid > 0 || available < amount;
}

function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

function Spin() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function VouchersPanel({
  draft,
  initialSearch = null,
  onOpenPayment,
}: {
  draft: Partial<VoucherDraft> | null;
  initialSearch?: string | null;
  onOpenPayment?: (paymentId: string) => void;
}) {
  const can = useCan();
  const [rows, setRows] = useState<Voucher[] | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [dateDraft, setDateDraft] = useState({ from: "", to: "" });
  const [typeDraft, setTypeDraft] = useState<VoucherType | "">("");
  const [statusDraft, setStatusDraft] = useState<VoucherStatus | "">("");
  const [methodDraft, setMethodDraft] = useState<PaymentMode | "">("");
  const [searchDraft, setSearchDraft] = useState(initialSearch ?? "");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedType, setAppliedType] = useState<VoucherType | "">("");
  const [appliedStatus, setAppliedStatus] = useState<VoucherStatus | "">("");
  const [appliedMethod, setAppliedMethod] = useState<PaymentMode | "">("");
  const [appliedSearch, setAppliedSearch] = useState(initialSearch ?? "");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState(emptyVoucherForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [viewing, setViewing] = useState<Voucher | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VoucherField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const saveLock = useRef(false);
  const [shareModal, setShareModal] = useState<"email" | "whatsapp" | null>(null);
  const [shareVoucher, setShareVoucher] = useState<Voucher | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [settlementFor, setSettlementFor] = useState<Voucher | null>(null);
  const [linkedPayments, setLinkedPayments] = useState<PaymentListItem[] | null>(null);
  const [linkedPaymentTotal, setLinkedPaymentTotal] = useState(0);

  const refreshList = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    expensesApi
      .listCategories()
      .then((cats) => {
        if (!cancelled) setCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    expensesApi
      .list({ limit: 100 })
      .then((list) => {
        if (!cancelled) setExpenses(list.items);
      })
      .catch(() => {
        if (!cancelled) setExpenses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let redirecting = false;
    setLoading(true);
    setListError(null);
    vouchersApi
      .list({
        page,
        limit,
        search: appliedSearch.trim() || undefined,
        voucherType: appliedType || undefined,
        status: appliedStatus || undefined,
        paymentMode: appliedMethod || undefined,
        from: appliedFrom || undefined,
        to: appliedTo || undefined,
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
        setPagination(list.pagination);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows(null);
        setListError(apiErrorMessage(error, "Could not load vouchers."));
      })
      .finally(() => {
        if (!cancelled && !redirecting) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    page,
    limit,
    appliedSearch,
    appliedType,
    appliedStatus,
    appliedMethod,
    appliedFrom,
    appliedTo,
    reloadToken,
  ]);

  useEffect(() => {
    if (!initialSearch) return;
    setSearchDraft(initialSearch);
    setAppliedSearch(initialSearch);
    setPage(1);
  }, [initialSearch]);

  useEffect(() => {
    if (!draft) return;
    setEditing(null);
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setForm({
      ...emptyVoucherForm(),
      voucherDate: draft.voucherDate || localCalendarDate(),
      voucherType: draft.voucherType ?? "PAYMENT",
      title: draft.title ?? "",
      description: draft.description ?? "",
      paidBy: draft.paidBy ?? "",
      payee: draft.payee ?? "",
      amount: draft.amount ?? "",
      paymentMode: draft.paymentMode ?? "BANK_TRANSFER",
      categoryId: draft.categoryId ?? "",
      expenseId: draft.expenseId ?? "",
      referenceNumber: draft.referenceNumber ?? "",
      notes: draft.notes ?? "",
      status: draft.status ?? "COMPLETED",
    });
    setFormOpen(true);
  }, [draft]);

  function applyFilters() {
    const rangeError = dateRangeError(dateDraft.from, dateDraft.to);
    if (rangeError) {
      setFilterError(rangeError);
      return;
    }
    setFilterError(null);
    setNotice(null);
    setAppliedFrom(dateDraft.from);
    setAppliedTo(dateDraft.to);
    setAppliedType(typeDraft);
    setAppliedStatus(statusDraft);
    setAppliedMethod(methodDraft);
    setAppliedSearch(searchDraft.trim());
    setPage(1);
  }

  function clearFilters() {
    setDateDraft({ from: "", to: "" });
    setTypeDraft("");
    setStatusDraft("");
    setMethodDraft("");
    setSearchDraft("");
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedType("");
    setAppliedStatus("");
    setAppliedMethod("");
    setAppliedSearch("");
    setFilterError(null);
    setNotice(null);
    setPage(1);
  }

  function resetForm() {
    setForm(emptyVoucherForm());
    setEditing(null);
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(false);
  }

  function openForm() {
    resetForm();
    setNotice(null);
    setViewing(null);
    setFormOpen(true);
  }

  function startEdit(voucher: Voucher) {
    setEditing(voucher);
    setViewing(null);
    setFile(null);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setForm({
      voucherDate: voucher.voucherDate.slice(0, 10),
      voucherType: voucher.voucherType,
      title: voucher.title,
      description: voucher.description,
      paidBy: voucher.paidBy,
      payee: voucher.payee,
      amount: formatAmountInput(voucher.amount),
      paymentMode: voucher.paymentMode,
      categoryId: voucher.categoryId ?? "",
      expenseId: voucher.expenseId ?? "",
      referenceNumber: voucher.referenceNumber,
      notes: voucher.notes,
      status: voucher.status,
    });
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || saveLock.current) return;
    const errors = validateVoucherForm(form);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const amount = parseExpenseAmount(form.amount);
    if (!amount.ok) return;

    const shared = {
      voucherDate: form.voucherDate,
      voucherType: form.voucherType,
      title: form.title.trim(),
      paidBy: form.paidBy.trim(),
      payee: form.payee.trim(),
      amount: amount.amount,
      paymentMode: form.paymentMode,
    };
    const current = editing;
    const documentFile = file;

    saveLock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (current) {
        const payload: UpdateVoucherRequest = {
          ...shared,
          description: form.description.trim(),
          referenceNumber: form.referenceNumber.trim(),
          notes: form.notes.trim(),
          categoryId: form.categoryId || null,
          expenseId: form.expenseId || null,
        };
        await vouchersApi.update(current.id, payload);
        if (documentFile) {
          try {
            await vouchersApi.uploadDocument(current.id, documentFile);
          } catch (uploadError) {
            setNotice({
              ok: false,
              text: `Voucher ${current.voucherNumber} was updated, but the document could not be uploaded. The voucher was not duplicated or deleted. ${apiErrorMessage(uploadError, "Document upload failed.")}`,
            });
            resetForm();
            refreshList();
            return;
          }
        }
        setNotice({ ok: true, text: `Voucher ${current.voucherNumber} updated.` });
        resetForm();
        refreshList();
        return;
      }

      const created = await vouchersApi.create({
        ...shared,
        description: form.description.trim() || undefined,
        referenceNumber: form.referenceNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
        categoryId: form.categoryId || undefined,
        expenseId: form.expenseId || undefined,
        status: form.status,
      });
      if (documentFile) {
        try {
          await vouchersApi.uploadDocument(created.id, documentFile);
        } catch (uploadError) {
          await vouchersApi.delete(created.id).catch(() => undefined);
          throw uploadError;
        }
      }
      setNotice({ ok: true, text: `Voucher ${created.voucherNumber} created.` });
      resetForm();
      refreshList();
      printVoucher(created);
    } catch (error) {
      setFormError(
        apiErrorMessage(error, current ? "Could not update voucher." : "Could not create voucher."),
      );
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  function openShareModal(voucher: Voucher, mode: "email" | "whatsapp") {
    setShareVoucher(voucher);
    setShareModal(mode);
    setShareEmail("");
    setSharePhone("");
    setShareMessage(
      mode === "email" ? "Please find the voucher attached." : "Please find the voucher details.",
    );
    setShareError("");
  }

  function closeShareModal() {
    setShareModal(null);
    setShareVoucher(null);
    setShareError("");
  }

  async function submitShare(event: React.FormEvent) {
    event.preventDefault();
    if (!shareVoucher || !shareModal || shareBusy) return;
    setShareBusy(true);
    setShareError("");
    try {
      if (shareModal === "email") {
        await vouchersApi.sendEmail(shareVoucher.id, {
          email: shareEmail.trim(),
          message: shareMessage.trim() || undefined,
        });
        setNotice({ ok: true, text: `Email sent for voucher ${shareVoucher.voucherNumber}.` });
      } else {
        await vouchersApi.sendWhatsapp(shareVoucher.id, {
          phone: sharePhone.trim(),
          message: shareMessage.trim() || undefined,
        });
        setNotice({
          ok: true,
          text: `WhatsApp message sent for voucher ${shareVoucher.voucherNumber}.`,
        });
      }
      closeShareModal();
    } catch (error) {
      setShareError(apiErrorMessage(error, "Could not send voucher."));
    } finally {
      setShareBusy(false);
    }
  }

  async function del(voucher: Voucher) {
    if (!confirm(`Delete voucher ${voucher.voucherNumber}?`)) return;
    setNotice(null);
    try {
      await vouchersApi.delete(voucher.id);
      if (editing?.id === voucher.id) resetForm();
      setNotice({ ok: true, text: "Voucher deleted." });
      refreshList();
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not delete voucher.") });
    }
  }

  async function cancelVoucher(voucher: Voucher) {
    if (
      !confirm(`Cancel voucher ${voucher.voucherNumber}? The record is kept and marked cancelled.`)
    )
      return;
    setNotice(null);
    try {
      await vouchersApi.updateStatus(voucher.id, "CANCELLED");
      if (editing?.id === voucher.id) resetForm();
      setNotice({ ok: true, text: `Voucher ${voucher.voucherNumber} cancelled.` });
      refreshList();
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not cancel voucher.") });
    }
  }

  function openDocument(url: string) {
    window.open(url, "_blank", "noopener");
  }

  function openSettlement(voucher: Voucher) {
    setViewing(null);
    setSettlementFor(voucher);
    setLinkedPayments(null);
    setLinkedPaymentTotal(0);
    paymentsApi
      .list({ voucherId: voucher.id, limit: 100 })
      .then((result) => {
        setLinkedPayments(result.items);
        setLinkedPaymentTotal(result.pagination.total);
      })
      .catch(() => {
        setLinkedPayments([]);
        setLinkedPaymentTotal(0);
      });
  }

  const filtersActive = Boolean(
    appliedFrom || appliedTo || appliedType || appliedStatus || appliedMethod || appliedSearch,
  );
  const recordLabel = `${pagination.total} voucher ${pagination.total === 1 ? "record" : "records"} match the current filters.`;
  const shown = rows ?? [];
  const hint = referenceHint(form.paymentMode);

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Vouchers</h1>
          <p className="mt-2 text-muted-foreground">
            {listError
              ? "Voucher records could not be loaded."
              : loaded
                ? recordLabel
                : "Loading vouchers…"}
          </p>
        </div>
        {can("vouchers.create") && (
        <button type="button" className="btn btn-primary shrink-0" onClick={openForm}>
          <Plus className="h-4 w-4" />
          Add Voucher
        </button>
        )}
      </div>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mb-4 text-sm ${notice.ok ? "text-success" : "text-destructive"}`}
        >
          {notice.text}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <L id="v-from" label="From date">
          <input
            id="v-from"
            type="date"
            className="field h-9"
            value={dateDraft.from}
            onChange={(event) =>
              setDateDraft((current) => ({ ...current, from: event.target.value }))
            }
          />
        </L>
        <L id="v-to" label="To date">
          <input
            id="v-to"
            type="date"
            className="field h-9"
            value={dateDraft.to}
            onChange={(event) =>
              setDateDraft((current) => ({ ...current, to: event.target.value }))
            }
          />
        </L>
        <L id="v-ft" label="Voucher type">
          <select
            id="v-ft"
            className="field h-9"
            value={typeDraft}
            onChange={(event) => setTypeDraft(event.target.value as VoucherType | "")}
          >
            <option value="">All types</option>
            {VOUCHER_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </L>
        <L id="v-fs" label="Voucher status">
          <select
            id="v-fs"
            className="field h-9"
            value={statusDraft}
            onChange={(event) => setStatusDraft(event.target.value as VoucherStatus | "")}
          >
            <option value="">All statuses</option>
            {VOUCHER_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </L>
        <L id="v-fmode" label="Payment method">
          <select
            id="v-fmode"
            className="field h-9"
            value={methodDraft}
            onChange={(event) => setMethodDraft(event.target.value as PaymentMode | "")}
          >
            <option value="">All methods</option>
            {PAYMENT_MODES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </L>
        <L id="v-search" label="Payee or reference">
          <input
            id="v-search"
            className="field h-9"
            value={searchDraft}
            placeholder="Payee, reference, or voucher no."
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </L>
        <button type="button" className="btn btn-primary h-9" onClick={applyFilters}>
          Apply filters
        </button>
        <button type="button" className="btn btn-outline h-9" onClick={clearFilters}>
          Clear filters
        </button>
      </div>
      {filterError && <p className="mt-2 text-sm text-destructive">{filterError}</p>}

      {loading ? (
        <Spin />
      ) : listError ? (
        <div className="card-site mt-4 p-10 text-center" role="alert">
          <p className="text-destructive">{listError}</p>
          <button type="button" className="btn btn-outline mt-4" onClick={refreshList}>
            Retry
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">
          {filtersActive ? "No vouchers match the selected filters." : "No vouchers yet."}
        </div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Voucher no.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Title</th>
                <th className="p-4">Payee</th>
                <th className="p-4">Payment method</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Settlement</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const locked = voucherHasAllocations(row);
                return (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-semibold">{row.voucherNumber}</td>
                    <td className="whitespace-nowrap p-4">{formatLedgerDate(row.voucherDate)}</td>
                    <td className="p-4">{voucherTypeLabel(row.voucherType)}</td>
                    <td className="p-4">
                      <div className="font-medium">{row.title}</div>
                      {row.expense && (
                        <div className="text-xs text-muted-foreground">
                          Expense: {row.expense.expenseName}
                        </div>
                      )}
                    </td>
                    <td className="p-4">{row.payee}</td>
                    <td className="p-4">{paymentModeLabel(row.paymentMode)}</td>
                    <td className="whitespace-nowrap p-4 text-right font-semibold">
                      {inr(row.amount)}
                    </td>
                    <td className="p-4">{voucherStatusLabel(row.status)}</td>
                    <td className="p-4">{settlementLabel(row.settlementStatus ?? "UNPAID")}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          title="View"
                          aria-label="View voucher"
                          onClick={() => {
                            setSettlementFor(null);
                            setViewing(row);
                          }}
                          className="btn btn-outline h-8 px-2"
                        >
                          View
                        </button>
                        {can("vouchers.update") && (
                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit voucher"
                          onClick={() => startEdit(row)}
                          className="btn btn-outline h-8 px-2"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        )}
                        {can("payments.read") && (
                        <button
                          type="button"
                          title="Payments"
                          aria-label="View payments"
                          onClick={() => openSettlement(row)}
                          className="btn btn-outline h-8 px-2"
                        >
                          Payments
                        </button>
                        )}
                        {row.document?.url && (
                          <button
                            type="button"
                            title="View document"
                            aria-label="View document"
                            onClick={() => openDocument(row.document!.url)}
                            className="btn btn-outline h-8 px-2"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {can("vouchers.send_email") && (
                        <button
                          type="button"
                          title="Send email"
                          aria-label="Send email"
                          onClick={() => openShareModal(row, "email")}
                          className="btn btn-outline h-8 px-2"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        )}
                        {can("vouchers.send_whatsapp") && (
                        <button
                          type="button"
                          title="Send WhatsApp"
                          aria-label="Send WhatsApp"
                          onClick={() => openShareModal(row, "whatsapp")}
                          className="btn btn-outline h-8 px-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        )}
                        <button
                          type="button"
                          title="Print"
                          aria-label="Print voucher"
                          onClick={() => printVoucher(row)}
                          className="btn btn-outline h-8 px-2"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {can("vouchers.status.update") && !locked && row.status !== "CANCELLED" && (
                          <button
                            type="button"
                            title="Cancel voucher"
                            aria-label="Cancel voucher"
                            onClick={() => cancelVoucher(row)}
                            className="btn btn-outline h-8 px-2"
                          >
                            Cancel
                          </button>
                        )}
                        {can("vouchers.delete") && !locked && (
                          <button
                            type="button"
                            title="Delete"
                            aria-label="Delete voucher"
                            onClick={() => del(row)}
                            className="btn btn-outline h-8 px-2 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
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
          pageSizeId="v-page-size"
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

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => {
            if (!busy) resetForm();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-form-title"
            className="card-site max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) resetForm();
            }}
            onSubmit={submit}
          >
            <h2 id="voucher-form-title" className="text-xl font-semibold">
              {editing ? "Edit Voucher" : "Add Voucher"}
            </h2>
            {editing && (
              <div className="mt-4 rounded-lg bg-secondary p-3 text-sm text-primary">
                <p>
                  Voucher number <span className="font-semibold">{editing.voucherNumber}</span>{" "}
                  stays the same.
                </p>
                <p className="mt-1">
                  Status:{" "}
                  <span className="font-semibold">{voucherStatusLabel(editing.status)}</span>.
                  Saving these details does not change the status.
                </p>
                {voucherHasAllocations(editing) && (
                  <p className="mt-1">
                    Payment allocations stay in place. The amount cannot drop below the reserved
                    total, and this voucher cannot be cancelled or deleted until those allocations
                    are released.
                  </p>
                )}
              </div>
            )}
            {form.expenseId && !editing && (
              <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-primary">
                Filled in from an expense. You can edit before creating.
              </p>
            )}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <L id="v-date" label="Voucher date *">
                  <input
                    id="v-date"
                    type="date"
                    className="field"
                    value={form.voucherDate}
                    aria-invalid={Boolean(fieldErrors.voucherDate)}
                    aria-describedby={fieldErrors.voucherDate ? "v-date-error" : undefined}
                    onChange={(event) => setForm({ ...form, voucherDate: event.target.value })}
                  />
                </L>
                <FieldError id="v-date-error" message={fieldErrors.voucherDate} />
              </div>
              <L id="v-type" label="Voucher type *">
                <select
                  id="v-type"
                  className="field"
                  value={form.voucherType}
                  onChange={(event) =>
                    setForm({ ...form, voucherType: event.target.value as VoucherType })
                  }
                >
                  {VOUCHER_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </L>
              <div>
                <L id="v-title" label="Title *">
                  <input
                    id="v-title"
                    className="field"
                    value={form.title}
                    aria-invalid={Boolean(fieldErrors.title)}
                    aria-describedby={fieldErrors.title ? "v-title-error" : undefined}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                </L>
                <FieldError id="v-title-error" message={fieldErrors.title} />
              </div>
              <L id="v-mode" label="Payment method *">
                <select
                  id="v-mode"
                  className="field"
                  value={form.paymentMode}
                  onChange={(event) =>
                    setForm({ ...form, paymentMode: event.target.value as PaymentMode })
                  }
                >
                  {PAYMENT_MODES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </L>
              <div>
                <L id="v-paid" label="Paid by *">
                  <input
                    id="v-paid"
                    className="field"
                    value={form.paidBy}
                    aria-invalid={Boolean(fieldErrors.paidBy)}
                    aria-describedby={fieldErrors.paidBy ? "v-paid-error" : undefined}
                    onChange={(event) => setForm({ ...form, paidBy: event.target.value })}
                  />
                </L>
                <FieldError id="v-paid-error" message={fieldErrors.paidBy} />
              </div>
              <div>
                <L id="v-payee" label="Payee *">
                  <input
                    id="v-payee"
                    className="field"
                    value={form.payee}
                    aria-invalid={Boolean(fieldErrors.payee)}
                    aria-describedby={fieldErrors.payee ? "v-payee-error" : undefined}
                    onChange={(event) => setForm({ ...form, payee: event.target.value })}
                  />
                </L>
                <FieldError id="v-payee-error" message={fieldErrors.payee} />
              </div>
              <div>
                <L id="v-amt" label="Amount (₹) *">
                  <input
                    id="v-amt"
                    inputMode="decimal"
                    className="field"
                    value={form.amount}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? "v-amt-error" : undefined}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  />
                </L>
                <FieldError id="v-amt-error" message={fieldErrors.amount} />
              </div>
              {!editing && (
                <L id="v-status" label="Status *">
                  <select
                    id="v-status"
                    className="field"
                    value={form.status}
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as VoucherStatus })
                    }
                  >
                    {VOUCHER_STATUSES.filter((item) => item.value !== "CANCELLED").map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </L>
              )}
              <L id="v-cat" label="Category">
                <select
                  id="v-cat"
                  className="field"
                  value={form.categoryId}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
                >
                  <option value="">None</option>
                  {form.categoryId &&
                    !categories.some((category) => category.id === form.categoryId) && (
                      <option value={form.categoryId}>
                        {editing?.category?.name ?? "Linked category"}
                      </option>
                    )}
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </L>
              <L id="v-exp" label="Expense">
                <select
                  id="v-exp"
                  className="field"
                  value={form.expenseId}
                  onChange={(event) => setForm({ ...form, expenseId: event.target.value })}
                >
                  <option value="">None</option>
                  {form.expenseId && !expenses.some((expense) => expense.id === form.expenseId) && (
                    <option value={form.expenseId}>
                      {editing?.expense?.expenseName ?? "Linked expense"}
                    </option>
                  )}
                  {expenses.map((expense) => (
                    <option key={expense.id} value={expense.id}>
                      {expense.expenseName} — {formatLedgerDate(expense.date)} —{" "}
                      {inr(expense.amount)}
                    </option>
                  ))}
                </select>
              </L>
              <div>
                <L id="v-ref" label={referenceLabel(form.paymentMode)}>
                  <input
                    id="v-ref"
                    className="field"
                    value={form.referenceNumber}
                    onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })}
                  />
                </L>
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
              </div>
              <div>
                <L id="v-doc" label="Supporting document">
                  <label
                    htmlFor="v-doc"
                    className="field flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="truncate text-muted-foreground">
                      {file
                        ? file.name
                        : editing?.document
                          ? "Replace the current document"
                          : "Upload image or PDF (max 10 MB)"}
                    </span>
                    <input
                      id="v-doc"
                      type="file"
                      accept="image/*,.pdf"
                      className="sr-only"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </L>
                {editing?.document && !file && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Current document: {editing.document.fileName}{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => openDocument(editing.document!.url)}
                    >
                      View
                    </button>
                  </p>
                )}
                {editing?.document && file && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This file replaces {editing.document.fileName}.
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <L id="v-desc" label="Description">
                  <textarea
                    id="v-desc"
                    rows={2}
                    className="field h-auto py-3"
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </L>
              </div>
              <div className="md:col-span-2">
                <L id="v-notes" label="Notes">
                  <textarea
                    id="v-notes"
                    rows={2}
                    className="field h-auto py-3"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </L>
              </div>
            </div>
            {formError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline" disabled={busy} onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                {editing ? "Save Changes" : "Save voucher"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => setViewing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="voucher-view-title"
            className="card-site max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="voucher-view-title" className="text-xl font-semibold">
              {viewing.voucherNumber}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {voucherTypeLabel(viewing.voucherType)} · {voucherStatusLabel(viewing.status)} ·{" "}
              {settlementLabel(viewing.settlementStatus ?? "UNPAID")}
            </p>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatLedgerDate(viewing.voucherDate)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount</dt>
                <dd>{inr(viewing.amount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Paid</dt>
                <dd>{inr(viewing.amountPaid ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Outstanding</dt>
                <dd>{inr(viewing.outstandingAmount ?? viewing.amount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payee</dt>
                <dd>{viewing.payee}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Paid by</dt>
                <dd>{viewing.paidBy}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Payment method</dt>
                <dd>{paymentModeLabel(viewing.paymentMode)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reference</dt>
                <dd>{viewing.referenceNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{viewing.category?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Linked expense</dt>
                <dd>
                  {viewing.expense
                    ? `${viewing.expense.expenseName} · ${inr(viewing.expense.amount)}`
                    : "—"}
                </dd>
              </div>
            </dl>
            {viewing.title && (
              <p className="mt-4 text-sm">
                <span className="font-semibold">Title. </span>
                {viewing.title}
              </p>
            )}
            {viewing.description && <p className="mt-2 text-sm">{viewing.description}</p>}
            {viewing.notes && <p className="mt-2 text-sm text-muted-foreground">{viewing.notes}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline" onClick={() => setViewing(null)}>
                Close
              </button>
              {can("vouchers.update") && (
              <button type="button" className="btn btn-primary" onClick={() => startEdit(viewing)}>
                Edit
              </button>
              )}
              {can("payments.read") && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => openSettlement(viewing)}
              >
                View payments
              </button>
              )}
            </div>
          </div>
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
            onClick={(event) => event.stopPropagation()}
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
                    onChange={(event) => setShareEmail(event.target.value)}
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
                    onChange={(event) => setSharePhone(event.target.value)}
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
                  onChange={(event) => setShareMessage(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={closeShareModal}
                disabled={shareBusy}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button type="submit" disabled={shareBusy} className="btn btn-primary">
                {shareBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {shareModal === "email" ? "Send Email" : "Send WhatsApp"}
              </button>
            </div>
            {shareError && (
              <p role="status" className="mt-3 text-sm text-destructive">
                {shareError}
              </p>
            )}
          </form>
        </div>
      )}

      {settlementFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="voucher-payments-title"
        >
          <div className="card-site max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <h2 id="voucher-payments-title" className="text-xl font-semibold">
              Payments for {settlementFor.voucherNumber}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Amount {inr(settlementFor.amount)} · Paid {inr(settlementFor.amountPaid ?? 0)} ·
              Outstanding {inr(settlementFor.outstandingAmount ?? settlementFor.amount)} ·{" "}
              {settlementLabel(settlementFor.settlementStatus ?? "UNPAID")}
            </p>
            {settlementFor.expense && (
              <p className="mt-2 text-sm text-muted-foreground">
                Linked expense: {settlementFor.expense.expenseName}
              </p>
            )}
            {linkedPayments === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : linkedPayments.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No payment has been allocated to this voucher. Historical vouchers are not given a
                fabricated payment.
              </p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm">
                {linkedPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3"
                  >
                    <div>
                      <p className="font-semibold">{payment.paymentNumber}</p>
                      <p className="text-muted-foreground">
                        {paymentModeLabel(payment.paymentMethod)} ·{" "}
                        {payment.chequeNumber || payment.referenceNumber || "No reference"} ·{" "}
                        {payment.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p>{inr(payment.amount)}</p>
                      {onOpenPayment && (
                        <button
                          type="button"
                          className="font-semibold text-primary"
                          onClick={() => onOpenPayment(payment.id)}
                        >
                          Open payment
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {linkedPayments !== null && linkedPaymentTotal > linkedPayments.length && (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {linkedPayments.length} of {linkedPaymentTotal} payments.
              </p>
            )}
            <button
              type="button"
              className="btn btn-outline mt-6"
              onClick={() => setSettlementFor(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const esc = (value: string) =>
  value.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );

function words(n: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number) =>
    (x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? " " + a[x % 10] : ""}`)!;
  const three = (x: number) =>
    `${x >= 100 ? a[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " : "") : ""}${x % 100 ? two(x % 100) : ""}`;
  if (n === 0) return "Zero";
  let out = "";
  const cr = Math.floor(n / 1e7);
  n %= 1e7;
  const lk = Math.floor(n / 1e5);
  n %= 1e5;
  const th = Math.floor(n / 1000);
  n %= 1000;
  if (cr) out += three(cr) + " Crore ";
  if (lk) out += two(lk) + " Lakh ";
  if (th) out += two(th) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}

function printVoucher(voucher: Voucher) {
  const amt = Number(voucher.amount);
  const rupees = Math.floor(amt);
  const paiseAmount = Math.round((amt - rupees) * 100);
  const inWords = `Rupees ${words(rupees)}${paiseAmount ? ` and ${words(paiseAmount)} Paise` : ""} Only`;
  const particulars = voucher.description || voucher.title;
  const popup = window.open("", "_blank", "width=820,height=900");
  if (!popup) {
    alert("Please allow pop-ups to print the voucher.");
    return;
  }
  popup.document
    .write(`<!doctype html><html><head><title>Voucher ${voucher.voucherNumber}</title><style>
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
  <div class="row"><span><b>Voucher No:</b> ${esc(voucher.voucherNumber)}</span><span><b>Date:</b> ${esc(formatLedgerDate(voucher.voucherDate))}</span></div>
  <div class="row"><span><b>Paid by:</b> ${esc(voucher.paidBy)}</span><span><b>Payee:</b> ${esc(voucher.payee)}</span></div>
  <div class="row"><span><b>Mode:</b> ${esc(paymentModeLabel(voucher.paymentMode))}</span><span><b>Settlement:</b> ${esc(settlementLabel(voucher.settlementStatus ?? "UNPAID"))}</span></div>
  <div class="row"><span><b>Paid:</b> ${esc(inr(voucher.amountPaid ?? 0))}</span><span><b>Outstanding:</b> ${esc(inr(voucher.outstandingAmount ?? voucher.amount))}</span></div>
  <table><tr><th>Particulars</th><th class="r">Amount (INR)</th></tr>
  <tr><td>${esc(particulars || "-")}</td><td class="r">${esc(inr(amt))}</td></tr>
  <tr><th>Total</th><th class="r">${esc(inr(amt))}</th></tr></table>
  <p style="font-size:14px;margin-top:16px"><b>Amount in words:</b> ${esc(inWords)}</p>
  <div class="sig"><div>Prepared by</div><div>Approved by</div><div>Receiver's signature</div></div>
  </div><script>window.onload=()=>setTimeout(()=>window.print(),200)</script></body></html>`);
  popup.document.close();
}
