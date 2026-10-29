import { useEffect, useState, type ReactNode } from "react";
import {
  Eye,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { apiErrorMessage } from "@/lib/api";
import { formatLedgerDate } from "@/lib/expense-form";
import type { ExpenseReceipt } from "@/lib/expenses-api";
import {
  vouchersApi,
  type VoucherDetail,
} from "@/lib/vouchers-api";
import { ReceiptPreviewModal } from "./receipt-preview";

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n));

function settlementLabel(status: string): string {
  if (status === "PARTIALLY_PAID") return "Partially paid";
  if (status === "PAID") return "Paid";
  return "Unpaid";
}

function voucherStatusLabel(status: string): string {
  if (status === "DRAFT") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  return "Completed";
}

function voucherTypeLabel(type: string): string {
  if (type === "RECEIPT") return "Receipt";
  if (type === "GENERAL") return "General";
  return "Payment";
}

function paymentModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    UPI: "UPI",
    CARD: "Card",
    CHEQUE: "Cheque",
    OTHER: "Other",
  };
  return labels[mode] ?? mode;
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ISSUED: "Issued",
    PRESENTED: "Presented",
    CLEARED: "Cleared",
    BOUNCED: "Bounced",
    CANCELLED: "Cancelled",
    INITIATED: "Initiated",
    COMPLETED: "Completed",
    FAILED: "Failed",
  };
  return labels[status] ?? status;
}

function timestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card-site p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

export function VoucherDetailsScreen({
  voucherId,
  onBack,
  onEdit,
  onPrint,
  onSendEmail,
  onSendWhatsapp,
  onDelete,
  onCancel,
  onOpenPayment,
}: {
  voucherId: string;
  onBack: () => void;
  onEdit: (voucher: VoucherDetail) => void;
  onPrint: (voucher: VoucherDetail) => void;
  onSendEmail: (voucher: VoucherDetail) => void;
  onSendWhatsapp: (voucher: VoucherDetail) => void;
  onDelete: (voucher: VoucherDetail) => void;
  onCancel: (voucher: VoucherDetail) => void;
  onOpenPayment?: (paymentId: string) => void;
}) {
  const can = useCan();
  const [detail, setDetail] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [previewReceipt, setPreviewReceipt] = useState<ExpenseReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    vouchersApi
      .get(voucherId)
      .then((voucher) => {
        if (!cancelled) setDetail(voucher);
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(apiErrorMessage(err, "Could not load voucher details."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [voucherId, reloadToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Back to vouchers
        </button>
        <div className="card-site p-10 text-center" role="alert">
          <p className="text-destructive">{error ?? "Voucher not found."}</p>
          <button
            type="button"
            className="btn btn-outline mt-4"
            onClick={() => setReloadToken((token) => token + 1)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const locked = (detail.amountReserved ?? 0) > 0 || (detail.amountPaid ?? 0) > 0;
  const expenseMissing =
    detail.expenseId &&
    detail.expense &&
    detail.expense.expenseName === "Expense no longer available";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button type="button" className="btn btn-outline mb-4 h-9" onClick={onBack}>
            Back to vouchers
          </button>
          <h1 className="text-3xl font-semibold">{detail.voucherNumber}</h1>
          <p className="mt-2 text-muted-foreground">
            {voucherTypeLabel(detail.voucherType)} · {voucherStatusLabel(detail.status)} ·{" "}
            {settlementLabel(detail.settlementStatus ?? "UNPAID")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("vouchers.update") && (
            <button type="button" className="btn btn-outline" onClick={() => onEdit(detail)}>
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={() => onPrint(detail)}>
            <Printer className="h-4 w-4" />
            Print
          </button>
          {can("vouchers.send_email") && (
            <button type="button" className="btn btn-outline" onClick={() => onSendEmail(detail)}>
              <Mail className="h-4 w-4" />
              Email
            </button>
          )}
          {can("vouchers.send_whatsapp") && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onSendWhatsapp(detail)}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>
          )}
          {can("vouchers.status.update") && !locked && detail.status !== "CANCELLED" && (
            <button type="button" className="btn btn-outline" onClick={() => onCancel(detail)}>
              Cancel
            </button>
          )}
          {can("vouchers.delete") && !locked && (
            <button
              type="button"
              className="btn btn-outline text-destructive"
              onClick={() => onDelete(detail)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <Section title="Voucher summary">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Voucher number">{detail.voucherNumber}</Field>
          <Field label="Voucher date">{formatLedgerDate(detail.voucherDate)}</Field>
          <Field label="Payment status">
            {settlementLabel(detail.settlementStatus ?? "UNPAID")}
          </Field>
          <Field label="Total amount">{inr(detail.amount)}</Field>
          <Field label="Amount paid">{inr(detail.amountPaid ?? 0)}</Field>
          <Field label="Outstanding">
            {inr(detail.outstandingAmount ?? detail.amount)}
          </Field>
          <Field label="Title">{detail.title || "—"}</Field>
          <Field label="Voucher type">{voucherTypeLabel(detail.voucherType)}</Field>
          <Field label="Lifecycle status">{voucherStatusLabel(detail.status)}</Field>
        </dl>
        {detail.description ? (
          <p className="mt-4 text-sm whitespace-pre-line">{detail.description}</p>
        ) : null}
      </Section>

      <Section title="Payee information">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Payee / supplier">{detail.payee || "—"}</Field>
          <Field label="Paid by">{detail.paidBy || "—"}</Field>
          <Field label="Payment method">{paymentModeLabel(detail.paymentMode)}</Field>
          <Field label="Reference">{detail.referenceNumber || "—"}</Field>
          <Field label="Category">{detail.category?.name ?? "—"}</Field>
        </dl>
        {detail.notes ? (
          <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line">{detail.notes}</p>
        ) : null}
      </Section>

      <Section title="Linked expense and invoice">
        {!detail.expenseId || !detail.expense ? (
          <p className="text-sm text-muted-foreground">No expense is linked to this voucher.</p>
        ) : expenseMissing ? (
          <p className="text-sm text-muted-foreground">
            The linked expense is no longer available.
          </p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Expense">{detail.expense.expenseName}</Field>
            <Field label="Invoice date">
              {detail.expense.invoiceDate
                ? formatLedgerDate(detail.expense.invoiceDate)
                : "—"}
            </Field>
            <Field label="Received date">
              {detail.expense.receivedDate
                ? formatLedgerDate(detail.expense.receivedDate)
                : "—"}
            </Field>
            <Field label="Expense category">{detail.expense.category?.name ?? "—"}</Field>
            <Field label="Expense paid by">{detail.expense.paidBy || "—"}</Field>
            <Field label="Original expense amount">{inr(detail.expense.amount)}</Field>
            <Field label="Receipt">
              {detail.expense.receipt?.url ? (
                <button
                  type="button"
                  className="btn btn-outline h-8 px-3 text-sm"
                  onClick={() =>
                    setPreviewReceipt(detail.expense!.receipt as ExpenseReceipt)
                  }
                >
                  <Eye className="h-4 w-4" />
                  View receipt
                </button>
              ) : (
                "—"
              )}
            </Field>
            {detail.expense.notes ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Expense notes">
                  <span className="whitespace-pre-line">{detail.expense.notes}</span>
                </Field>
              </div>
            ) : null}
          </dl>
        )}
      </Section>

      <Section title="Voucher financial details">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Voucher amount">{inr(detail.amount)}</Field>
          <Field label="Payable amount">{inr(detail.amount)}</Field>
          <Field label="Amount reserved">
            {inr(detail.amountReserved ?? 0)}
          </Field>
          <Field label="Amount settled">{inr(detail.amountPaid ?? 0)}</Field>
          <Field label="Outstanding">
            {inr(detail.outstandingAmount ?? detail.amount)}
          </Field>
          <Field label="Available to allocate">
            {inr(detail.availableToAllocate ?? 0)}
          </Field>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Settled amounts include only cleared or completed payments. Reserved amounts cover
          open instruments that are not void.
        </p>
      </Section>

      <Section title="Payment history">
        {(detail.payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment has been allocated to this voucher.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-3">Payment</th>
                  <th className="pb-3 pr-3">Date</th>
                  <th className="pb-3 pr-3">Method</th>
                  <th className="pb-3 pr-3 text-right">Allocated</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3">Reference</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-3 font-semibold">{payment.paymentNumber}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatLedgerDate(payment.paymentDate)}
                    </td>
                    <td className="py-3 pr-3">{paymentModeLabel(payment.paymentMethod)}</td>
                    <td className="py-3 pr-3 text-right whitespace-nowrap">
                      {inr(payment.allocatedAmount)}
                    </td>
                    <td className="py-3 pr-3">{paymentStatusLabel(payment.status)}</td>
                    <td className="py-3 pr-3">
                      {payment.chequeNumber ||
                        payment.referenceNumber ||
                        payment.transferMethod ||
                        "—"}
                    </td>
                    <td className="py-3 text-right">
                      {onOpenPayment && can("payments.read") ? (
                        <button
                          type="button"
                          className="font-semibold text-primary"
                          onClick={() => onOpenPayment(payment.id)}
                        >
                          Open payment
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Documents and communication">
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Voucher document</p>
            {detail.document?.url ? (
              <button
                type="button"
                className="btn btn-outline mt-2 h-8 px-3 text-sm"
                onClick={() => window.open(detail.document!.url, "_blank", "noopener")}
              >
                <Eye className="h-4 w-4" />
                View {detail.document.fileName}
              </button>
            ) : (
              <p className="mt-1 text-muted-foreground">No supporting document uploaded.</p>
            )}
          </div>
          <div>
            <p className="font-semibold">Delivery history</p>
            {(detail.deliveryAttempts ?? []).length === 0 ? (
              <p className="mt-1 text-muted-foreground">No email or WhatsApp delivery recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {detail.deliveryAttempts.map((attempt, index) => (
                  <li key={`${attempt.channel}-${attempt.attemptedAt}-${index}`}>
                    <span className="font-medium">{attempt.channel}</span> to {attempt.recipient} ·{" "}
                    {attempt.status} · {timestamp(attempt.attemptedAt)}
                    {attempt.errorSummary ? (
                      <span className="text-destructive"> — {attempt.errorSummary}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Audit information">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Created">{timestamp(detail.createdAt)}</Field>
          <Field label="Last updated">{timestamp(detail.updatedAt)}</Field>
        </dl>
      </Section>

      {previewReceipt && (
        <ReceiptPreviewModal
          receipt={previewReceipt}
          onClose={() => setPreviewReceipt(null)}
        />
      )}
    </div>
  );
}
