import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, Loader2, Pencil, Plus, Upload } from "lucide-react";
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
import {
  defaultAllocationAmount,
  documentFileError,
  paymentAmountFromAllocations,
  summarizeAllocations,
  validatePaymentForm,
  type AllocationDraft,
  type PaymentField,
} from "@/lib/payment-form";
import {
  paymentsApi,
  type CreatePaymentRequest,
  type EligibleVoucher,
  type Payment,
  type PaymentListItem,
  type PaymentMethod,
  type PaymentStatus,
  type TransferMethod,
} from "@/lib/payments-api";

const PAGE_SIZES = [10, 20, 50, 100] as const;

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n) || 0);

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

const TRANSFER_METHODS: { value: TransferMethod; label: string }[] = [
  { value: "NEFT", label: "NEFT" },
  { value: "RTGS", label: "RTGS" },
  { value: "IMPS", label: "IMPS" },
  { value: "OTHER", label: "Other" },
];

const STATUS_LABELS: Record<string, string> = {
  ISSUED: "Issued",
  PRESENTED: "Presented",
  CLEARED: "Cleared",
  BOUNCED: "Bounced",
  CANCELLED: "Cancelled",
  INITIATED: "Initiated",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

type PaymentFilters = {
  from: string;
  to: string;
  method: PaymentMethod | "";
  status: PaymentStatus | "";
  payee: string;
  chequeNumber: string;
  reference: string;
};

type PaymentForm = {
  paymentMethod: PaymentMethod;
  paymentDate: string;
  amount: string;
  payee: string;
  sourceAccount: string;
  referenceNumber: string;
  chequeNumber: string;
  chequeDate: string;
  transferMethod: TransferMethod | "";
  remarks: string;
  status: PaymentStatus;
};

function emptyFilters(): PaymentFilters {
  return {
    from: "",
    to: "",
    method: "",
    status: "",
    payee: "",
    chequeNumber: "",
    reference: "",
  };
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function methodLabel(method: string): string {
  return METHODS.find((item) => item.value === method)?.label ?? method;
}

function transferLabel(method: string): string {
  return TRANSFER_METHODS.find((item) => item.value === method)?.label ?? method;
}

function defaultStatus(method: PaymentMethod): PaymentStatus {
  if (method === "CHEQUE") return "ISSUED";
  if (method === "BANK_TRANSFER") return "INITIATED";
  return "COMPLETED";
}

function creatableStatuses(method: PaymentMethod): PaymentStatus[] {
  if (method === "CHEQUE") return ["ISSUED", "PRESENTED", "CLEARED"];
  if (method === "BANK_TRANSFER") return ["INITIATED", "COMPLETED"];
  return ["COMPLETED"];
}

function statusFieldLabel(method: PaymentMethod): string {
  if (method === "CHEQUE") return "Cheque status *";
  if (method === "BANK_TRANSFER") return "Transfer status *";
  return "Status *";
}

function statusHint(method: PaymentMethod): string {
  if (method === "CHEQUE") {
    return "Issued and presented cheques are not treated as cleared funds.";
  }
  if (method === "BANK_TRANSFER") {
    return "An initiated transfer is not settled until it is completed.";
  }
  return "Completed payments settle their allocations. A payment with no vouchers keeps the full amount unallocated.";
}

function emptyForm(): PaymentForm {
  return {
    paymentMethod: "CHEQUE",
    paymentDate: localCalendarDate(),
    amount: "",
    payee: "",
    sourceAccount: "",
    referenceNumber: "",
    chequeNumber: "",
    chequeDate: localCalendarDate(),
    transferMethod: "NEFT",
    remarks: "",
    status: "ISSUED",
  };
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function settlementText(status: string): string {
  return status.replaceAll("_", " ").toLowerCase();
}

function instrumentAction(row: PaymentListItem): string | null {
  if (row.paymentMethod === "CHEQUE" || row.chequeNumber) return "Cheque";
  if (row.paymentMethod === "BANK_TRANSFER") return "Transfer";
  if (row.referenceNumber) return "Reference";
  return null;
}

function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm text-destructive">{message}</p>;
}

function draftFromVoucher(voucher: EligibleVoucher, amount: string): AllocationDraft {
  return {
    voucherId: voucher.id,
    amount,
    availableToAllocate: voucher.availableToAllocate,
    voucherNumber: voucher.voucherNumber,
    voucherDate: voucher.voucherDate,
    title: voucher.title,
    payee: voucher.payee,
    voucherAmount: voucher.amount,
    amountPaid: voucher.amountPaid,
    outstandingAmount: voucher.outstandingAmount,
  };
}

export function PaymentsPanel({
  focusId,
  onFocusHandled,
  onOpenVoucher,
}: {
  focusId?: string | null;
  onFocusHandled?: () => void;
  onOpenVoucher?: (voucherNumber: string) => void;
}) {
  const can = useCan();
  const [rows, setRows] = useState<PaymentListItem[] | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [draftFilters, setDraftFilters] = useState<PaymentFilters>(emptyFilters);
  const [applied, setApplied] = useState<PaymentFilters>(emptyFilters);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [form, setForm] = useState<PaymentForm>(emptyForm());
  const [allocations, setAllocations] = useState<AllocationDraft[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PaymentField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [viewing, setViewing] = useState<Payment | null>(null);
  const [eligible, setEligible] = useState<EligibleVoucher[]>([]);
  const [voucherSearch, setVoucherSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const saveLock = useRef(false);

  const refreshList = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    let cancelled = false;
    let redirecting = false;
    setLoading(true);
    setListError(null);
    const params: {
      page: number;
      limit: number;
      from?: string;
      to?: string;
      paymentMethod?: PaymentMethod;
      status?: PaymentStatus;
      payee?: string;
      chequeNumber?: string;
      reference?: string;
    } = { page, limit };
    if (applied.from) params.from = applied.from;
    if (applied.to) params.to = applied.to;
    if (applied.method) params.paymentMethod = applied.method;
    if (applied.status) params.status = applied.status;
    if (applied.payee) params.payee = applied.payee;
    if (applied.chequeNumber) params.chequeNumber = applied.chequeNumber;
    if (applied.reference) params.reference = applied.reference;
    paymentsApi.list(params)
      .then((result) => {
        if (cancelled) return;
        const nextPage = clampPage(page, result.pagination.totalPages);
        if (nextPage !== page) {
          redirecting = true;
          setPage(nextPage);
          return;
        }
        setRows(result.items);
        setPagination(result.pagination);
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setRows(null);
        setListError(apiErrorMessage(error, "Could not load payments."));
      })
      .finally(() => {
        if (!cancelled && !redirecting) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, limit, applied, reloadToken]);

  useEffect(() => {
    if (!formOpen || editing?.financiallyLocked) return;
    const handle = window.setTimeout(() => {
      const query: { search?: string; excludePaymentId?: string; limit: number } = { limit: 20 };
      if (voucherSearch.trim()) query.search = voucherSearch.trim();
      if (editing?.id) query.excludePaymentId = editing.id;
      paymentsApi.eligibleVouchers(query)
        .then(setEligible)
        .catch(() => setEligible([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [formOpen, voucherSearch, editing?.id, editing?.financiallyLocked]);

  useEffect(() => {
    if (!focusId) return;
    paymentsApi.get(focusId)
      .then((payment) => {
        setViewing(payment);
        onFocusHandled?.();
      })
      .catch((error) => {
        setNotice({ ok: false, text: apiErrorMessage(error, "Could not open the payment.") });
        onFocusHandled?.();
      });
  }, [focusId, onFocusHandled]);

  const summary = summarizeAllocations(form.amount, allocations);
  const locked = Boolean(editing?.financiallyLocked);
  const amountFromAllocations = !locked && allocations.length > 0;
  const showAccount = form.paymentMethod === "CHEQUE" || form.paymentMethod === "BANK_TRANSFER";
  const filtersActive = Boolean(
    applied.from || applied.to || applied.method || applied.status || applied.payee || applied.chequeNumber || applied.reference,
  );
  const displayPage = pagination.totalPages === 0 ? 1 : pagination.page;
  const displayPages = Math.max(pagination.totalPages, 1);
  const pageStart = pagination.total === 0 ? 0 : (displayPage - 1) * limit + 1;
  const pageEnd = pagination.total === 0 ? 0 : Math.min(displayPage * limit, pagination.total);
  const recordLabel = `${pagination.total} payment ${pagination.total === 1 ? "record" : "records"} match the current filters.`;

  function resetEditor() {
    setForm(emptyForm());
    setAllocations([]);
    setEditing(null);
    setFile(null);
    setRemoveDocument(false);
    setVoucherSearch("");
    setFieldErrors({});
    setFormError(null);
    setEligible([]);
  }

  function openForm() {
    resetEditor();
    setNotice(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    resetEditor();
  }

  function startEdit(payment: Payment) {
    setViewing(null);
    setEditing(payment);
    setFile(null);
    setRemoveDocument(false);
    setFieldErrors({});
    setFormError(null);
    setNotice(null);
    setForm({
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      amount: formatAmountInput(payment.amount),
      payee: payment.payee,
      sourceAccount: payment.sourceAccount,
      referenceNumber: payment.referenceNumber,
      chequeNumber: payment.chequeNumber,
      chequeDate: payment.chequeDate ?? "",
      transferMethod: (payment.transferMethod || "NEFT") as TransferMethod,
      remarks: payment.remarks,
      status: payment.status,
    });
    const nextAllocations = payment.allocations.map((row) => ({
      voucherId: row.voucherId,
      amount: formatAmountInput(row.amount),
      availableToAllocate: row.availableToAllocate + (payment.financiallyLocked ? 0 : row.amount),
      voucherNumber: row.voucherNumber,
      voucherDate: row.voucherDate,
      title: row.voucherTitle,
      payee: row.payee,
      voucherAmount: row.voucherAmount,
      amountPaid: row.amountPaid,
      outstandingAmount: row.outstandingAmount,
    }));
    setAllocations(nextAllocations);
    setForm((current) => ({
      ...current,
      amount: payment.financiallyLocked || nextAllocations.length === 0
        ? formatAmountInput(payment.amount)
        : paymentAmountFromAllocations(nextAllocations),
    }));
    setFormOpen(true);
  }

  async function openPayment(id: string, mode: "view" | "edit" | "vouchers" = "view") {
    setBusy(true);
    try {
      const payment = await paymentsApi.get(id);
      if (mode === "edit") {
        startEdit(payment);
        return;
      }
      const onlyVoucher = payment.allocations[0];
      if (mode === "vouchers" && payment.allocations.length === 1 && onlyVoucher && onOpenVoucher) {
        onOpenVoucher(onlyVoucher.voucherNumber);
        return;
      }
      setViewing(payment);
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not open the payment.") });
    } finally {
      setBusy(false);
    }
  }

  function applyFilters() {
    const rangeError = dateRangeError(draftFilters.from, draftFilters.to);
    if (rangeError) {
      setFilterError(rangeError);
      return;
    }
    setFilterError(null);
    setNotice(null);
    setApplied({
      ...draftFilters,
      payee: draftFilters.payee.trim(),
      chequeNumber: draftFilters.chequeNumber.trim(),
      reference: draftFilters.reference.trim(),
    });
    setPage(1);
  }

  function clearFilters() {
    const cleared = emptyFilters();
    setDraftFilters(cleared);
    setApplied(cleared);
    setFilterError(null);
    setNotice(null);
    setPage(1);
  }

  function commitAllocations(next: AllocationDraft[]) {
    setAllocations(next);
    if (locked) return;
    setForm((current) => ({
      ...current,
      amount: next.length === 0 ? "0" : paymentAmountFromAllocations(next),
    }));
  }

  function addVoucher(voucher: EligibleVoucher) {
    if (allocations.some((row) => row.voucherId === voucher.id)) return;
    commitAllocations([
      ...allocations,
      draftFromVoucher(voucher, defaultAllocationAmount(voucher)),
    ]);
  }

  function chooseDocument(next: File | null) {
    setFile(next);
    if (next) setRemoveDocument(false);
    setFieldErrors((current) => {
      const errors = { ...current };
      const message = next ? documentFileError(next) : null;
      if (message) errors.document = message;
      else delete errors.document;
      return errors;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || saveLock.current) return;
    const errors = validatePaymentForm({
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
      amount: form.amount,
      payee: form.payee,
      sourceAccount: form.sourceAccount,
      chequeNumber: form.chequeNumber,
      chequeDate: form.chequeDate,
      transferMethod: form.transferMethod,
      locked,
      allocations,
      summary,
      documentError: file ? documentFileError(file) : null,
    });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const parsedAmount = parseExpenseAmount(form.amount);
    if (!locked && !parsedAmount.ok) return;

    saveLock.current = true;
    setBusy(true);
    try {
      const saved = editing?.financiallyLocked
        ? await paymentsApi.update(editing.id, { remarks: form.remarks.trim() })
        : await saveUnlocked(parsedAmount.ok ? parsedAmount.amount : 0);

      const documentFile = file;
      const shouldRemove = Boolean(editing?.document && removeDocument && !documentFile);
      if (documentFile) {
        try {
          await paymentsApi.uploadDocument(saved.id, documentFile);
        } catch (uploadError) {
          closeForm();
          setNotice({
            ok: false,
            text: `Payment ${saved.paymentNumber} was saved, but the document could not be uploaded. The payment was kept. ${apiErrorMessage(uploadError, "Document upload failed.")}`,
          });
          refreshList();
          return;
        }
      } else if (shouldRemove) {
        try {
          await paymentsApi.removeDocument(saved.id);
        } catch (removeError) {
          closeForm();
          setNotice({
            ok: false,
            text: `Payment ${saved.paymentNumber} was saved, but the document could not be removed. ${apiErrorMessage(removeError, "Document removal failed.")}`,
          });
          refreshList();
          return;
        }
      }

      closeForm();
      setNotice({
        ok: true,
        text: editing
          ? `Payment ${saved.paymentNumber} updated.`
          : `Payment ${saved.paymentNumber} recorded. Unallocated amount ${inr(saved.unallocatedAmount)} is not applied to a voucher.`,
      });
      refreshList();
    } catch (error) {
      setFormError(apiErrorMessage(error, editing ? "Could not update the payment." : "Could not save the payment."));
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  function paymentFields(amount: number): Omit<CreatePaymentRequest, "paymentMethod" | "status"> {
    const payload: Omit<CreatePaymentRequest, "paymentMethod" | "status"> = {
      paymentDate: form.paymentDate,
      amount,
      payee: form.payee.trim(),
      remarks: form.remarks.trim(),
      referenceNumber: form.referenceNumber.trim(),
      allocations: allocations.map((row) => {
        const parsed = parseExpenseAmount(row.amount);
        return { voucherId: row.voucherId, amount: parsed.ok ? parsed.amount : 0 };
      }),
    };
    if (showAccount) payload.sourceAccount = form.sourceAccount.trim();
    if (form.paymentMethod === "CHEQUE") {
      payload.chequeNumber = form.chequeNumber.trim();
      payload.chequeDate = form.chequeDate;
    }
    if (form.paymentMethod === "BANK_TRANSFER" && form.transferMethod) {
      payload.transferMethod = form.transferMethod;
    }
    return payload;
  }

  function saveUnlocked(amount: number) {
    const fields = paymentFields(amount);
    if (editing) return paymentsApi.update(editing.id, fields);
    return paymentsApi.create({
      ...fields,
      paymentMethod: form.paymentMethod,
      status: form.status,
    });
  }

  async function changeStatus(payment: Payment, next: PaymentStatus) {
    const label = statusLabel(next);
    if (!confirm(`Mark ${payment.paymentNumber} as ${label}? This keeps the original record.`)) return;
    setBusy(true);
    try {
      const updated = await paymentsApi.updateStatus(payment.id, next);
      setViewing(updated);
      setNotice({ ok: true, text: `${payment.paymentNumber} is now ${label}.` });
      refreshList();
    } catch (error) {
      setNotice({ ok: false, text: apiErrorMessage(error, "Could not change the payment status.") });
    } finally {
      setBusy(false);
    }
  }

  function openDocument(url: string) {
    window.open(url, "_blank", "noopener");
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Payments</h1>
          <p className="mt-2 text-muted-foreground">
            {listError
              ? "Payment records could not be loaded."
              : loaded
                ? recordLabel
                : "Loading payments…"}
          </p>
        </div>
        {can("payments.create") && (
        <button type="button" className="btn btn-primary shrink-0" onClick={openForm}>
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
        )}
      </div>

      {notice && (
        <p role="status" className={`mb-4 text-sm ${notice.ok ? "text-success" : "text-destructive"}`}>{notice.text}</p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <L id="p-from" label="From payment date">
          <input id="p-from" type="date" className="field h-9" value={draftFilters.from} onChange={(event) => setDraftFilters((current) => ({ ...current, from: event.target.value }))} />
        </L>
        <L id="p-to" label="To payment date">
          <input id="p-to" type="date" className="field h-9" value={draftFilters.to} onChange={(event) => setDraftFilters((current) => ({ ...current, to: event.target.value }))} />
        </L>
        <L id="p-fmethod" label="Payment method">
          <select id="p-fmethod" className="field h-9" value={draftFilters.method} onChange={(event) => setDraftFilters((current) => ({ ...current, method: event.target.value as PaymentMethod | "" }))}>
            <option value="">All methods</option>
            {METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </L>
        <L id="p-fstatus" label="Payment status">
          <select id="p-fstatus" className="field h-9" value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as PaymentStatus | "" }))}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </L>
        <L id="p-fpayee" label="Payee">
          <input id="p-fpayee" className="field h-9" value={draftFilters.payee} onChange={(event) => setDraftFilters((current) => ({ ...current, payee: event.target.value }))} />
        </L>
        <L id="p-fcheque" label="Cheque number">
          <input id="p-fcheque" className="field h-9" value={draftFilters.chequeNumber} onChange={(event) => setDraftFilters((current) => ({ ...current, chequeNumber: event.target.value }))} />
        </L>
        <L id="p-futr" label="UTR or transaction reference">
          <input id="p-futr" className="field h-9" value={draftFilters.reference} onChange={(event) => setDraftFilters((current) => ({ ...current, reference: event.target.value }))} />
        </L>
        <button type="button" className="btn btn-primary h-9" onClick={applyFilters}>Apply filters</button>
        <button type="button" className="btn btn-outline h-9" onClick={clearFilters}>Clear filters</button>
      </div>
      {filterError && <p className="mt-2 text-sm text-destructive">{filterError}</p>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : listError ? (
        <div className="card-site mt-4 p-10 text-center" role="alert">
          <p className="text-destructive">{listError}</p>
          <button type="button" className="btn btn-outline mt-4" onClick={refreshList}>Retry</button>
        </div>
      ) : (rows ?? []).length === 0 ? (
        <div className="card-site mt-4 p-10 text-center text-muted-foreground">
          {filtersActive ? "No payments match the selected filters." : "No payments yet."}
        </div>
      ) : (
        <div className="card-site mt-4 overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Payment date</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Method</th>
                <th className="p-4">Cheque number</th>
                <th className="p-4">UTR / reference</th>
                <th className="p-4">Payee</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Allocated</th>
                <th className="p-4 text-right">Unallocated</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Vouchers</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{formatLedgerDate(row.paymentDate)}</td>
                  <td className="p-4 font-semibold">{row.paymentNumber}</td>
                  <td className="p-4">{methodLabel(row.paymentMethod)}</td>
                  <td className="p-4">{row.chequeNumber || "—"}</td>
                  <td className="p-4">{row.referenceNumber || "—"}</td>
                  <td className="p-4">{row.payee}</td>
                  <td className="p-4 text-right font-semibold">{inr(row.amount)}</td>
                  <td className="p-4 text-right">{inr(row.allocatedAmount)}</td>
                  <td className="p-4 text-right">{inr(row.unallocatedAmount)}</td>
                  <td className="p-4">{statusLabel(row.status)}</td>
                  <td className="p-4 text-right">{row.linkedVoucherCount}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn btn-outline h-8 px-2" aria-label={`View ${row.paymentNumber}`} onClick={() => openPayment(row.id)}>
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      {can("payments.update") && <button type="button" className="btn btn-outline h-8 px-2" aria-label={`Edit ${row.paymentNumber}`} onClick={() => openPayment(row.id, "edit")}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>}
                      {row.linkedVoucherCount > 0 && (
                        <button type="button" className="btn btn-outline h-8 px-2" aria-label={`Vouchers for ${row.paymentNumber}`} onClick={() => openPayment(row.id, "vouchers")}>
                          Vouchers
                        </button>
                      )}
                      {instrumentAction(row) && (
                        <button type="button" className="btn btn-outline h-8 px-2" aria-label={`Instrument for ${row.paymentNumber}`} onClick={() => openPayment(row.id)}>
                          {instrumentAction(row)}
                        </button>
                      )}
                      {can("payments.status.update") && row.allowedStatuses.length > 0 && (
                        <button type="button" className="btn btn-outline h-8 px-2" aria-label={`Status for ${row.paymentNumber}`} onClick={() => openPayment(row.id)}>
                          Status
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

      {loaded && !listError && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            <p>Page {displayPage} of {displayPages}</p>
            <p>{pagination.total === 0 ? "Showing 0 on this page." : `Showing ${pageStart}–${pageEnd} of ${pagination.total} on this page.`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="p-page-size" className="text-sm font-semibold">Rows per page</label>
            <select
              id="p-page-size"
              className="field h-9 w-auto"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button type="button" className="btn btn-outline h-9" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <button type="button" className="btn btn-outline h-9" disabled={loading || pagination.totalPages === 0 || page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
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
            aria-labelledby="payment-form-title"
            className="card-site max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) closeForm();
            }}
            onSubmit={submit}
          >
            <h2 id="payment-form-title" className="text-xl font-semibold">{editing ? "Edit Payment" : "Add Payment"}</h2>
            {editing && (
              <p className="mt-3 rounded-lg bg-secondary p-3 text-sm text-primary">
                Updating payment <span className="font-semibold">{editing.paymentNumber}</span>. This does not create another payment.
                {" "}Status stays {statusLabel(editing.status)} until you use the status actions.
              </p>
            )}
            {locked && (
              <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">
                This payment is posted. Amount, account, reference, and allocations stay as recorded. You can still update remarks or the supporting document. Use a status correction for a bounce, failure, or cancellation, then record a replacement payment if needed.
              </p>
            )}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <L id="p-method" label="Payment method *">
                <select
                  id="p-method"
                  className="field"
                  value={form.paymentMethod}
                  disabled={Boolean(editing) || locked}
                  onChange={(event) => {
                    const paymentMethod = event.target.value as PaymentMethod;
                    setForm({ ...form, paymentMethod, status: defaultStatus(paymentMethod) });
                    setFieldErrors({});
                  }}
                >
                  {METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </L>
              {!editing && (
                <div>
                  <L id="p-status" label={statusFieldLabel(form.paymentMethod)}>
                    <select
                      id="p-status"
                      className="field"
                      value={form.status}
                      onChange={(event) => setForm({ ...form, status: event.target.value as PaymentStatus })}
                    >
                      {creatableStatuses(form.paymentMethod).map((item) => (
                        <option key={item} value={item}>{statusLabel(item)}</option>
                      ))}
                    </select>
                  </L>
                  <p className="mt-1 text-xs text-muted-foreground">{statusHint(form.paymentMethod)}</p>
                </div>
              )}
              <div>
                <L id="p-date" label="Payment date *">
                  <input
                    id="p-date"
                    type="date"
                    className="field"
                    disabled={locked}
                    value={form.paymentDate}
                    aria-invalid={Boolean(fieldErrors.paymentDate)}
                    aria-describedby={fieldErrors.paymentDate ? "p-date-error" : "p-date-hint"}
                    onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
                  />
                </L>
                <p id="p-date-hint" className="mt-1 text-xs text-muted-foreground">
                  Actual payment transaction date. Each instalment keeps its own date.
                </p>
                <FieldError id="p-date-error" message={fieldErrors.paymentDate} />
              </div>
              <div>
                <L id="p-amount" label="Payment amount (INR) *">
                  <input
                    id="p-amount"
                    className="field"
                    inputMode="decimal"
                    readOnly={amountFromAllocations}
                    disabled={locked}
                    value={amountFromAllocations ? inr(summary.allocated) : form.amount}
                    aria-readonly={amountFromAllocations || undefined}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? "p-amount-error" : amountFromAllocations ? "p-amount-hint" : undefined}
                    onChange={(event) => {
                      if (amountFromAllocations || locked) return;
                      setForm({ ...form, amount: event.target.value });
                    }}
                  />
                </L>
                {amountFromAllocations && (
                  <p id="p-amount-hint" className="mt-1 text-xs text-muted-foreground">
                    Calculated from the selected vouchers.
                  </p>
                )}
                <FieldError id="p-amount-error" message={fieldErrors.amount} />
              </div>
              <div>
                <L id="p-payee" label="Payee *">
                  <input
                    id="p-payee"
                    className="field"
                    disabled={locked}
                    value={form.payee}
                    aria-invalid={Boolean(fieldErrors.payee)}
                    aria-describedby={fieldErrors.payee ? "p-payee-error" : undefined}
                    onChange={(event) => setForm({ ...form, payee: event.target.value })}
                  />
                </L>
                <FieldError id="p-payee-error" message={fieldErrors.payee} />
              </div>
              {showAccount && (
                <div>
                  <L id="p-account" label={form.paymentMethod === "CHEQUE" ? "Issuing bank / account *" : "Bank / source account *"}>
                    <input
                      id="p-account"
                      className="field"
                      disabled={locked}
                      value={form.sourceAccount}
                      aria-invalid={Boolean(fieldErrors.sourceAccount)}
                      aria-describedby={fieldErrors.sourceAccount ? "p-account-error" : undefined}
                      onChange={(event) => setForm({ ...form, sourceAccount: event.target.value })}
                    />
                  </L>
                  <FieldError id="p-account-error" message={fieldErrors.sourceAccount} />
                </div>
              )}
              {form.paymentMethod === "CHEQUE" && (
                <>
                  <div>
                    <L id="p-cheque" label="Cheque number *">
                      <input
                        id="p-cheque"
                        className="field"
                        disabled={locked}
                        value={form.chequeNumber}
                        aria-invalid={Boolean(fieldErrors.chequeNumber)}
                        aria-describedby={fieldErrors.chequeNumber ? "p-cheque-error" : undefined}
                        onChange={(event) => setForm({ ...form, chequeNumber: event.target.value })}
                      />
                    </L>
                    <FieldError id="p-cheque-error" message={fieldErrors.chequeNumber} />
                  </div>
                  <div>
                    <L id="p-cheque-date" label="Cheque date *">
                      <input
                        id="p-cheque-date"
                        type="date"
                        className="field"
                        disabled={locked}
                        value={form.chequeDate}
                        aria-invalid={Boolean(fieldErrors.chequeDate)}
                        aria-describedby={fieldErrors.chequeDate ? "p-cheque-date-error" : undefined}
                        onChange={(event) => setForm({ ...form, chequeDate: event.target.value })}
                      />
                    </L>
                    <FieldError id="p-cheque-date-error" message={fieldErrors.chequeDate} />
                  </div>
                </>
              )}
              {form.paymentMethod === "BANK_TRANSFER" && (
                <div>
                  <L id="p-transfer" label="Transfer method *">
                    <select
                      id="p-transfer"
                      className="field"
                      disabled={locked}
                      value={form.transferMethod}
                      aria-invalid={Boolean(fieldErrors.transferMethod)}
                      aria-describedby={fieldErrors.transferMethod ? "p-transfer-error" : undefined}
                      onChange={(event) => setForm({ ...form, transferMethod: event.target.value as TransferMethod })}
                    >
                      {TRANSFER_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </L>
                  <FieldError id="p-transfer-error" message={fieldErrors.transferMethod} />
                </div>
              )}
              <L id="p-ref" label={form.paymentMethod === "BANK_TRANSFER" ? "UTR / transaction reference" : "Reference"}>
                <input id="p-ref" className="field" disabled={locked} value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} />
              </L>
              <div className="md:col-span-2">
                <L id="p-remarks" label="Remarks">
                  <textarea id="p-remarks" rows={2} className="field h-auto py-3" value={form.remarks} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
                </L>
              </div>
              <div className="md:col-span-2">
                <L id="p-doc" label="Supporting document">
                  <label htmlFor="p-doc" className="field flex cursor-pointer items-center gap-2 text-sm">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="truncate text-muted-foreground">
                      {file
                        ? file.name
                        : removeDocument
                          ? "Document will be removed"
                          : editing?.document
                            ? "Replace the current document"
                            : "JPEG, PNG, or PDF (max 10 MB)"}
                    </span>
                    <input
                      id="p-doc"
                      type="file"
                      accept="image/jpeg,image/png,.pdf,application/pdf"
                      className="sr-only"
                      aria-invalid={Boolean(fieldErrors.document)}
                      aria-describedby={fieldErrors.document ? "p-doc-error" : undefined}
                      onChange={(event) => chooseDocument(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </L>
                <FieldError id="p-doc-error" message={fieldErrors.document} />
                {editing?.document && !file && !removeDocument && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Current document: {editing.document.fileName}</span>
                    <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => openDocument(editing.document!.url)}>View</button>
                    <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => setRemoveDocument(true)}>Remove document</button>
                  </div>
                )}
                {editing && removeDocument && !file && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The current document will be removed when you save.{" "}
                    <button type="button" className="font-semibold underline" onClick={() => setRemoveDocument(false)}>Keep document</button>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-lg font-semibold">Allocate to Vouchers</h3>
              {!locked && (
                <>
                  <L id="p-vsearch" label="Find eligible vouchers">
                    <input id="p-vsearch" className="field" value={voucherSearch} placeholder="Voucher number, title, or payee" onChange={(event) => setVoucherSearch(event.target.value)} />
                  </L>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead className="text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-3">Voucher</th>
                          <th className="p-3">Voucher date</th>
                          <th className="p-3">Title</th>
                          <th className="p-3">Payee</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-right">Paid</th>
                          <th className="p-3 text-right">Outstanding</th>
                          <th className="p-3">Payment status</th>
                          <th className="p-3 text-right">Available</th>
                          <th className="p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {eligible.length === 0 ? (
                          <tr><td className="p-3 text-muted-foreground" colSpan={10}>No unpaid or partially paid vouchers with a balance available to allocate.</td></tr>
                        ) : eligible.map((voucher) => (
                          <tr key={voucher.id} className="border-t border-border">
                            <td className="p-3 font-semibold">{voucher.voucherNumber}</td>
                            <td className="p-3">{formatLedgerDate(voucher.voucherDate)}</td>
                            <td className="p-3">{voucher.title}</td>
                            <td className="p-3">{voucher.payee}</td>
                            <td className="p-3 text-right">{inr(voucher.amount)}</td>
                            <td className="p-3 text-right">{inr(voucher.amountPaid ?? 0)}</td>
                            <td className="p-3 text-right">{inr(voucher.outstandingAmount)}</td>
                            <td className="p-3">{settlementText(voucher.settlementStatus)}</td>
                            <td className="p-3 text-right">{inr(voucher.availableToAllocate)}</td>
                            <td className="p-3 text-right">
                              <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => addVoucher(voucher)} disabled={allocations.some((row) => row.voucherId === voucher.id)}>
                                <Plus className="h-4 w-4" />Add
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3">Voucher</th>
                      <th className="p-3">Voucher date</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Payee</th>
                      <th className="p-3 text-right">Original</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Outstanding</th>
                      <th className="p-3 text-right">Amount to allocate</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.length === 0 ? (
                      <tr><td className="p-3 text-muted-foreground" colSpan={9}>No vouchers selected. Enter the payment amount, or add vouchers to calculate it.</td></tr>
                    ) : allocations.map((row) => (
                      <tr key={row.voucherId} className="border-t border-border">
                        <td className="p-3 font-semibold">{row.voucherNumber ?? row.voucherId}</td>
                        <td className="p-3">{row.voucherDate ? formatLedgerDate(row.voucherDate) : "—"}</td>
                        <td className="p-3">{row.title || "—"}</td>
                        <td className="p-3">{row.payee || "—"}</td>
                        <td className="p-3 text-right">{row.voucherAmount == null ? "—" : inr(row.voucherAmount)}</td>
                        <td className="p-3 text-right">{row.amountPaid == null ? "—" : inr(row.amountPaid)}</td>
                        <td className="p-3 text-right">{row.outstandingAmount == null ? "—" : inr(row.outstandingAmount)}</td>
                        <td className="p-3 text-right">
                          <label htmlFor={`alloc-${row.voucherId}`} className="sr-only">Amount to allocate</label>
                          <input
                            id={`alloc-${row.voucherId}`}
                            className="field h-9 text-right"
                            inputMode="decimal"
                            disabled={locked}
                            value={row.amount}
                            onChange={(event) => commitAllocations(allocations.map((item) => item.voucherId === row.voucherId ? { ...item, amount: event.target.value } : item))}
                          />
                        </td>
                        <td className="p-3 text-right">
                          {!locked && (
                            <button type="button" className="btn btn-outline h-8 px-3 text-sm" onClick={() => commitAllocations(allocations.filter((item) => item.voucherId !== row.voucherId))}>
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <p>Payment amount: <span className="font-semibold">{summary.unallocated === null ? "—" : inr(summary.allocated + summary.unallocated)}</span></p>
                <p>Total allocated: <span className="font-semibold">{inr(summary.allocated)}</span></p>
                <p>Unallocated amount: <span className="font-semibold">{summary.unallocated === null ? "—" : inr(summary.unallocated)}</span></p>
              </div>
              <p className="text-xs text-muted-foreground">
                {allocations.length > 0
                  ? "Payment amount is the sum of these allocation amounts."
                  : "No vouchers are linked. The amount you enter stays unallocated until you add a voucher."}
              </p>
              <FieldError id="p-alloc-error" message={fieldErrors.allocations} />
            </div>

            {formError && <p role="alert" className="mt-4 text-sm text-destructive">{formError}</p>}
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline" disabled={busy} onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editing ? "Save Changes" : "Save payment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => { if (!busy) setViewing(null); }}
        >
          <div
            className="card-site max-h-[90vh] w-full max-w-4xl overflow-y-auto p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-view-title"
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setViewing(null);
            }}
          >
            <h2 id="payment-view-title" className="text-xl font-semibold">{viewing.paymentNumber}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{methodLabel(viewing.paymentMethod)} · {statusLabel(viewing.status)} · {formatLedgerDate(viewing.paymentDate)}</p>
            {(viewing.paymentMethod === "CHEQUE" || viewing.chequeNumber) && (
              <div className="mt-4 rounded-lg bg-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cheque</p>
                <p className="mt-1 text-lg font-semibold">{viewing.chequeNumber || "—"}</p>
                <p className="text-sm">Cheque date {viewing.chequeDate ? formatLedgerDate(viewing.chequeDate) : "—"}</p>
              </div>
            )}
            {viewing.paymentMethod === "BANK_TRANSFER" && (
              <div className="mt-4 rounded-lg bg-secondary p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank transfer</p>
                <p className="mt-1 text-lg font-semibold">{viewing.referenceNumber || "No UTR recorded"}</p>
                <p className="text-sm">{viewing.transferMethod ? transferLabel(viewing.transferMethod) : "Transfer method not recorded"} · {statusLabel(viewing.status)}</p>
              </div>
            )}
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-muted-foreground">Payee</dt><dd>{viewing.payee}</dd></div>
              <div><dt className="text-muted-foreground">Source account</dt><dd>{viewing.sourceAccount || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Payment amount</dt><dd>{inr(viewing.amount)}</dd></div>
              <div><dt className="text-muted-foreground">Total allocated</dt><dd>{inr(viewing.allocatedAmount)}</dd></div>
              <div><dt className="text-muted-foreground">Unallocated amount</dt><dd>{inr(viewing.unallocatedAmount)}</dd></div>
              <div><dt className="text-muted-foreground">Reference</dt><dd>{viewing.referenceNumber || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Created</dt><dd>{timestamp(viewing.createdAt)} · {viewing.createdBy.email}</dd></div>
              <div><dt className="text-muted-foreground">Updated</dt><dd>{timestamp(viewing.updatedAt)}</dd></div>
            </dl>
            <div className="mt-4 text-sm">
              <p className="font-semibold">Remarks</p>
              <p className="mt-1">{viewing.remarks || "No remarks."}</p>
            </div>
            <div className="mt-4 text-sm">
              <p className="font-semibold">Supporting document</p>
              {viewing.document ? (
                <button type="button" className="btn btn-outline mt-2 h-8 px-3 text-sm" onClick={() => openDocument(viewing.document!.url)}>
                  View {viewing.document.fileName}
                </button>
              ) : (
                <p className="mt-1 text-muted-foreground">No supporting document.</p>
              )}
            </div>
            {(viewing.status === "BOUNCED" || viewing.status === "CANCELLED" || viewing.status === "FAILED") && (
              <p className="mt-3 text-sm text-muted-foreground">This payment no longer settles its vouchers. Record a new payment if you still need to pay them.</p>
            )}
            {viewing.status === "ISSUED" || viewing.status === "PRESENTED" || viewing.status === "INITIATED" ? (
              <p className="mt-3 text-sm text-muted-foreground">This payment is not cleared. Voucher outstanding balances do not treat it as settled funds.</p>
            ) : null}
            <h3 className="mt-6 font-semibold">Linked vouchers</h3>
            {viewing.allocations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No vouchers allocated. The full amount is unallocated.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Voucher</th>
                      <th className="p-2">Voucher date</th>
                      <th className="p-2">Title</th>
                      <th className="p-2 text-right">Allocation</th>
                      <th className="p-2 text-right">Outstanding</th>
                      <th className="p-2">Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewing.allocations.map((row) => (
                      <tr key={row.voucherId} className="border-t border-border">
                        <td className="p-2">
                          <button type="button" className="font-semibold text-primary" onClick={() => onOpenVoucher?.(row.voucherNumber)}>{row.voucherNumber}</button>
                        </td>
                        <td className="p-2">{row.voucherDate ? formatLedgerDate(row.voucherDate) : "—"}</td>
                        <td className="p-2">{row.voucherTitle || "—"}</td>
                        <td className="p-2 text-right">{inr(row.amount)}</td>
                        <td className="p-2 text-right">{inr(row.outstandingAmount)}</td>
                        <td className="p-2">{settlementText(row.settlementStatus)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3 className="mt-6 font-semibold">History</h3>
            {viewing.audit.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No audit history.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {viewing.audit.map((entry) => (
                  <li key={`${entry.action}-${entry.createdAt}`}>
                    <span className="font-medium">{entry.action}</span> · {entry.actorEmail} · {timestamp(entry.createdAt)} · {entry.summary}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setViewing(null)}>Close</button>
              {can("payments.update") && <button type="button" className="btn btn-primary" onClick={() => startEdit(viewing)}>Edit</button>}
              {can("payments.status.update") && viewing.allowedStatuses.map((next) => (
                <button key={next} type="button" className="btn btn-outline" onClick={() => changeStatus(viewing, next)}>
                  Mark {statusLabel(next)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
