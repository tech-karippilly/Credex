import { useEffect, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { useCan } from "@/components/admin/admin-access";
import { LedgerPagination } from "@/components/admin/ledger-pagination";
import { apiErrorMessage } from "@/lib/api";
import { expensesApi, type ExpenseCategory } from "@/lib/expenses-api";
import { clampPage, dateRangeError, formatLedgerDate } from "@/lib/expense-form";
import {
  emptyReportFilters,
  formatReportPeriod,
  sameReportFilters,
  type ReportFilterValues,
  type ReportKind,
} from "@/lib/report-form";
import {
  reportsApi,
  type ExpenseFinancialReport,
  type PaymentFinancialReport,
  type ReportGroup,
  type ReportMeta,
  type VoucherFinancialReport,
} from "@/lib/reports-api";

const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value) || 0);

const REPORT_TYPES: { id: ReportKind; label: string }[] = [
  { id: "expenses", label: "Expenses" },
  { id: "vouchers", label: "Vouchers" },
  { id: "payments", label: "Payments" },
];

const VOUCHER_TYPES = [
  { value: "PAYMENT", label: "Payment" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "GENERAL", label: "General" },
];

const VOUCHER_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_STATUSES = [
  { value: "ISSUED", label: "Issued" },
  { value: "PRESENTED", label: "Presented" },
  { value: "CLEARED", label: "Cleared" },
  { value: "BOUNCED", label: "Bounced" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "INITIATED", label: "Initiated" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

type AppliedReport = {
  type: ReportKind;
  filters: ReportFilterValues;
  page: number;
  limit: number;
};

type GeneratedReport =
  | { kind: "expenses"; data: ExpenseFinancialReport }
  | { kind: "vouchers"; data: VoucherFinancialReport }
  | { kind: "payments"; data: PaymentFinancialReport };

function L({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="card-site p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </article>
  );
}

function GroupTable({
  title,
  rows,
  amountLabel,
  cleared = false,
}: {
  title: string;
  rows: (ReportGroup & { clearedAmount?: number })[];
  amountLabel: string;
  cleared?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="card-site overflow-x-auto">
      <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</h2>
      <table className="w-full min-w-[420px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="p-4">Group</th>
            <th className="p-4 text-right">Count</th>
            <th className="p-4 text-right">{amountLabel}</th>
            {cleared && <th className="p-4 text-right">Cleared amount</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              <td className="p-4">{row.label}</td>
              <td className="p-4 text-right">{row.count}</td>
              <td className="p-4 text-right font-semibold">{inr(row.amount)}</td>
              {cleared && <td className="p-4 text-right">{inr(row.clearedAmount ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportNotes({ meta }: { meta: ReportMeta }) {
  return (
    <details className="text-sm text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">How these totals are calculated</summary>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {meta.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </details>
  );
}

function PeriodLine({ meta }: { meta: ReportMeta }) {
  const filters = meta.filters.map((filter) => `${filter.label}: ${filter.value}`).join(" · ");
  return (
    <div>
      <p className="text-sm font-semibold">Reporting period: {formatReportPeriod(meta.period)}</p>
      {filters && <p className="mt-1 text-sm text-muted-foreground">{filters}</p>}
    </div>
  );
}

export function ReportsPanel({
  onOpenVoucher,
  onOpenPayment,
}: {
  onOpenVoucher?: (voucherNumber: string) => void;
  onOpenPayment?: (paymentId: string) => void;
}) {
  const can = useCan();
  const [reportType, setReportType] = useState<ReportKind>("expenses");
  const [draft, setDraft] = useState<ReportFilterValues>(emptyReportFilters);
  const [applied, setApplied] = useState<AppliedReport | null>(null);
  const [result, setResult] = useState<GeneratedReport | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const dirty = Boolean(applied && !sameReportFilters(draft, applied.filters));
  const canExport = Boolean(applied && result && !dirty && !loading && !error && !exporting);

  useEffect(() => {
    let cancelled = false;
    expensesApi.listCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch((loadError) => {
        if (!cancelled) setCategoriesError(apiErrorMessage(loadError, "Could not load categories."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!applied) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let redirecting = false;
    setLoading(true);
    setError(null);
    setResult(null);
    const request = { ...applied.filters, page: applied.page, limit: applied.limit };
    const load =
      applied.type === "expenses"
        ? reportsApi.expenses(request).then((data) => ({ kind: "expenses" as const, data }))
        : applied.type === "vouchers"
          ? reportsApi.vouchers(request).then((data) => ({ kind: "vouchers" as const, data }))
          : reportsApi.payments(request).then((data) => ({ kind: "payments" as const, data }));

    load
      .then((next) => {
        if (cancelled) return;
        const nextPage = clampPage(applied.page, next.data.meta.pagination.totalPages);
        if (nextPage !== applied.page) {
          redirecting = true;
          setApplied({ ...applied, page: nextPage });
          return;
        }
        setResult(next);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setResult(null);
        setError(apiErrorMessage(loadError, "Could not generate the report."));
      })
      .finally(() => {
        if (!cancelled && !redirecting) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applied, reloadToken]);

  function updateDraft<K extends keyof ReportFilterValues>(key: K, value: ReportFilterValues[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFilterError(null);
    setNotice(null);
  }

  function chooseType(next: ReportKind) {
    setReportType(next);
    setDraft(emptyReportFilters());
    setApplied(null);
    setResult(null);
    setError(null);
    setFilterError(null);
    setNotice(null);
  }

  function generate() {
    const rangeError = dateRangeError(draft.from, draft.to);
    if (rangeError) {
      setFilterError(rangeError);
      setApplied(null);
      setResult(null);
      setError(null);
      return;
    }
    setFilterError(null);
    setNotice(null);
    setLoading(true);
    setApplied({
      type: reportType,
      filters: { ...draft },
      page: 1,
      limit: applied?.type === reportType ? applied.limit : 20,
    });
  }

  function clearFilters() {
    setDraft(emptyReportFilters());
    setApplied(null);
    setResult(null);
    setError(null);
    setFilterError(null);
    setNotice(null);
  }

  async function exportReport() {
    if (!applied || dirty) return;
    setExporting(true);
    setNotice(null);
    try {
      await reportsApi.exportReport(applied.type, applied.filters);
      setNotice({ ok: true, text: "Report exported." });
    } catch (exportError) {
      setNotice({ ok: false, text: apiErrorMessage(exportError, "Could not export the report.") });
    } finally {
      setExporting(false);
    }
  }

  const visible = result && !dirty ? result : null;

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Reports</h1>
          <p className="mt-2 text-muted-foreground">
            Generate and export financial reports for expenses, vouchers, and payments.
          </p>
        </div>
        {can("reports.export") && <button type="button" className="btn btn-outline" disabled={!canExport} onClick={exportReport}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export report
        </button>}
      </div>

      <section className="card-site p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <L id="report-type" label="Report type">
            <select
              id="report-type"
              className="field"
              value={reportType}
              onChange={(event) => chooseType(event.target.value as ReportKind)}
            >
              {REPORT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </L>
          <L id="report-from" label="From date">
            <input id="report-from" type="date" className="field" value={draft.from} onChange={(event) => updateDraft("from", event.target.value)} />
          </L>
          <L id="report-to" label="To date">
            <input id="report-to" type="date" className="field" value={draft.to} onChange={(event) => updateDraft("to", event.target.value)} />
          </L>
          {reportType === "expenses" && (
            <>
              <L id="report-category" label="Expense category">
                <select id="report-category" className="field" value={draft.categoryId} onChange={(event) => updateDraft("categoryId", event.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </L>
              <L id="report-paid-by" label="Paid by">
                <input id="report-paid-by" className="field" value={draft.paidBy} onChange={(event) => updateDraft("paidBy", event.target.value)} />
                <p className="mt-1.5 text-xs text-muted-foreground">Matches the recorded payer exactly.</p>
              </L>
              <L id="report-expense-search" label="Expense name">
                <input id="report-expense-search" className="field" value={draft.search} onChange={(event) => updateDraft("search", event.target.value)} />
              </L>
            </>
          )}
          {reportType === "vouchers" && (
            <>
              <L id="report-voucher-type" label="Voucher type">
                <select id="report-voucher-type" className="field" value={draft.voucherType} onChange={(event) => updateDraft("voucherType", event.target.value)}>
                  <option value="">All types</option>
                  {VOUCHER_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </L>
              <L id="report-voucher-status" label="Voucher status">
                <select id="report-voucher-status" className="field" value={draft.voucherStatus} onChange={(event) => updateDraft("voucherStatus", event.target.value)}>
                  <option value="">All statuses</option>
                  {VOUCHER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </L>
              <L id="report-payee" label="Payee">
                <input id="report-payee" className="field" value={draft.payee} onChange={(event) => updateDraft("payee", event.target.value)} />
              </L>
              <L id="report-payment-mode" label="Payment method">
                <select id="report-payment-mode" className="field" value={draft.paymentMode} onChange={(event) => updateDraft("paymentMode", event.target.value)}>
                  <option value="">All methods</option>
                  {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </L>
              <L id="report-reference" label="Voucher number or reference">
                <input id="report-reference" className="field" value={draft.reference} onChange={(event) => updateDraft("reference", event.target.value)} />
              </L>
            </>
          )}
          {reportType === "payments" && (
            <>
              <L id="report-payment-method" label="Payment method">
                <select id="report-payment-method" className="field" value={draft.paymentMethod} onChange={(event) => updateDraft("paymentMethod", event.target.value)}>
                  <option value="">All methods</option>
                  {METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </select>
              </L>
              <L id="report-payment-status" label="Payment status">
                <select id="report-payment-status" className="field" value={draft.paymentStatus} onChange={(event) => updateDraft("paymentStatus", event.target.value)}>
                  <option value="">All statuses</option>
                  {PAYMENT_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </L>
              <L id="report-payment-payee" label="Payee">
                <input id="report-payment-payee" className="field" value={draft.payee} onChange={(event) => updateDraft("payee", event.target.value)} />
              </L>
              <L id="report-cheque" label="Cheque number">
                <input id="report-cheque" className="field" value={draft.chequeNumber} onChange={(event) => updateDraft("chequeNumber", event.target.value)} />
              </L>
              <L id="report-utr" label="UTR or transaction reference">
                <input id="report-utr" className="field" value={draft.reference} onChange={(event) => updateDraft("reference", event.target.value)} />
              </L>
            </>
          )}
        </div>
        {categoriesError && reportType === "expenses" && (
          <p className="mt-3 text-sm text-destructive">{categoriesError}</p>
        )}
        {filterError && <p role="alert" className="mt-3 text-sm text-destructive">{filterError}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary h-9" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate report
          </button>
          <button type="button" className="btn btn-outline h-9" onClick={clearFilters}>Clear filters</button>
        </div>
      </section>

      {notice && (
        <p role="status" className={`mt-4 text-sm font-medium ${notice.ok ? "text-success" : "text-destructive"}`}>
          {notice.text}
        </p>
      )}
      {dirty && (
        <p className="mt-4 text-sm text-muted-foreground">Filters have changed. Generate the report again.</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16" role="status" aria-label="Generating report">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="card-site mt-6 p-10 text-center" role="alert">
          <p className="text-destructive">{error}</p>
          <button type="button" className="btn btn-outline mt-4" onClick={() => setReloadToken((token) => token + 1)}>
            Retry
          </button>
        </div>
      ) : visible?.kind === "expenses" ? (
        <ExpenseResult report={visible.data} />
      ) : visible?.kind === "vouchers" ? (
        <VoucherResult
          report={visible.data}
          {...(onOpenVoucher ? { onOpenVoucher } : {})}
        />
      ) : visible?.kind === "payments" ? (
        <PaymentResult
          report={visible.data}
          {...(onOpenPayment ? { onOpenPayment } : {})}
          {...(onOpenVoucher ? { onOpenVoucher } : {})}
        />
      ) : !dirty && (
        <div className="card-site mt-6 p-10 text-center text-muted-foreground">
          Choose a report type, set any filters, and generate a report.
        </div>
      )}

      {visible && (
        <LedgerPagination
          pageSizeId="report-page-size"
          page={visible.data.meta.pagination.page}
          totalPages={visible.data.meta.pagination.totalPages}
          limit={visible.data.meta.pagination.limit}
          loading={loading}
          onPageChange={(page) => setApplied((current) => (current ? { ...current, page } : current))}
          onLimitChange={(limit) => setApplied((current) => (current ? { ...current, page: 1, limit } : current))}
        />
      )}
    </>
  );
}

function ExpenseResult({ report }: { report: ExpenseFinancialReport }) {
  return (
    <div className="mt-6 space-y-5">
      <PeriodLine meta={report.meta} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Expenses" value={String(report.summary.count)} hint="Matching expense records" />
        <SummaryCard label="Expense total" value={inr(report.summary.expenseTotal)} hint="Recorded expenses, not payments" />
      </div>
      <ReportNotes meta={report.meta} />
      <div className="grid gap-4 xl:grid-cols-2">
        <GroupTable title="Category totals" rows={report.summary.byCategory} amountLabel="Expense total" />
        <GroupTable title="Date totals" rows={report.summary.byDate.map((row) => ({ ...row, label: formatLedgerDate(row.label) }))} amountLabel="Expense total" />
      </div>
      {report.items.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">No expenses match the selected filters.</div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Expense name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Paid by</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Receipt</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{formatLedgerDate(item.date)}</td>
                  <td className="p-4 font-medium">{item.expenseName}</td>
                  <td className="p-4">{item.categoryName}</td>
                  <td className="p-4">{item.paidBy}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(item.amount)}</td>
                  <td className="p-4">
                    {item.receiptAvailable && item.receiptUrl ? (
                      <a className="text-primary" href={item.receiptUrl} target="_blank" rel="noreferrer">View</a>
                    ) : "No"}
                  </td>
                  <td className="max-w-xs truncate p-4" title={item.notes}>{item.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VoucherResult({
  report,
  onOpenVoucher,
}: {
  report: VoucherFinancialReport;
  onOpenVoucher?: (voucherNumber: string) => void;
}) {
  return (
    <div className="mt-6 space-y-5">
      <PeriodLine meta={report.meta} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Vouchers" value={String(report.summary.count)} hint="Matching voucher records" />
        <SummaryCard label="Voucher total" value={inr(report.summary.voucherTotal)} hint="Voucher amounts, not disbursements" />
        <SummaryCard label="Amount settled" value={inr(report.summary.settledTotal)} hint="Cleared or completed payments only" />
        <SummaryCard label="Outstanding voucher balance" value={inr(report.summary.outstandingTotal)} hint="Voucher amount minus amount settled" />
      </div>
      <ReportNotes meta={report.meta} />
      <div className="grid gap-4 xl:grid-cols-2">
        <GroupTable title="Totals by type" rows={report.summary.byType} amountLabel="Voucher total" />
        <GroupTable title="Totals by status" rows={report.summary.byStatus} amountLabel="Voucher total" />
        <GroupTable title="Date totals" rows={report.summary.byDate.map((row) => ({ ...row, label: formatLedgerDate(row.label) }))} amountLabel="Voucher total" />
      </div>
      {report.items.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">No vouchers match the selected filters.</div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Voucher number</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Title</th>
                <th className="p-4">Payee</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Settlement</th>
                <th className="p-4">Linked expense</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    {onOpenVoucher ? (
                      <button type="button" className="font-medium text-primary" onClick={() => onOpenVoucher(item.voucherNumber)}>
                        {item.voucherNumber}
                      </button>
                    ) : item.voucherNumber}
                  </td>
                  <td className="whitespace-nowrap p-4">{formatLedgerDate(item.voucherDate)}</td>
                  <td className="p-4">{item.voucherTypeLabel}</td>
                  <td className="p-4">{item.title}</td>
                  <td className="p-4">{item.payee}</td>
                  <td className="p-4">{item.paymentModeLabel}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(item.amount)}</td>
                  <td className="p-4">{item.statusLabel}</td>
                  <td className="p-4">{item.settlementLabel}</td>
                  <td className="p-4">{item.expense?.expenseName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentResult({
  report,
  onOpenPayment,
  onOpenVoucher,
}: {
  report: PaymentFinancialReport;
  onOpenPayment?: (paymentId: string) => void;
  onOpenVoucher?: (voucherNumber: string) => void;
}) {
  return (
    <div className="mt-6 space-y-5">
      <PeriodLine meta={report.meta} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Payments" value={String(report.summary.count)} hint="Matching payment records" />
        <SummaryCard label="Recorded payment total" value={inr(report.summary.recordedTotal)} hint="Each payment counted once" />
        <SummaryCard label="Cleared / settled amount" value={inr(report.summary.clearedTotal)} hint="Cleared and completed only" />
        <SummaryCard label="Allocated amount" value={inr(report.summary.allocatedTotal)} hint="Mapped to vouchers, without double-counting" />
        <SummaryCard label="Unallocated amount" value={inr(report.summary.unallocatedTotal)} hint="Recorded total minus allocated amount" />
      </div>
      <ReportNotes meta={report.meta} />
      <div className="grid gap-4 xl:grid-cols-2">
        <GroupTable title="Totals by payment method" rows={report.summary.byMethod} amountLabel="Recorded amount" cleared />
        <GroupTable title="Totals by payment status" rows={report.summary.byStatus} amountLabel="Recorded amount" />
      </div>
      {report.items.length === 0 ? (
        <div className="card-site p-10 text-center text-muted-foreground">No payments match the selected filters.</div>
      ) : (
        <div className="card-site overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Method</th>
                <th className="p-4">Cheque</th>
                <th className="p-4">UTR</th>
                <th className="p-4">Payee</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 text-right">Allocated</th>
                <th className="p-4 text-right">Unallocated</th>
                <th className="p-4">Status</th>
                <th className="p-4">Vouchers</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap p-4">{formatLedgerDate(item.paymentDate)}</td>
                  <td className="p-4">
                    {onOpenPayment ? (
                      <button type="button" className="font-medium text-primary" onClick={() => onOpenPayment(item.id)}>
                        {item.paymentNumber}
                      </button>
                    ) : item.paymentNumber}
                  </td>
                  <td className="p-4">{item.paymentMethodLabel}</td>
                  <td className="p-4">
                    {item.chequeNumber
                      ? `${item.chequeNumber}${item.chequeDate ? ` · ${formatLedgerDate(item.chequeDate)}` : ""}`
                      : "—"}
                  </td>
                  <td className="p-4">{item.referenceNumber || "—"}</td>
                  <td className="p-4">{item.payee}</td>
                  <td className="whitespace-nowrap p-4 text-right font-semibold">{inr(item.amount)}</td>
                  <td className="whitespace-nowrap p-4 text-right">{inr(item.allocatedAmount)}</td>
                  <td className="whitespace-nowrap p-4 text-right">{inr(item.unallocatedAmount)}</td>
                  <td className="p-4">
                    {item.statusLabel}
                    {!item.countsAsCleared && (
                      <span className="mt-1 block text-xs text-muted-foreground">Not cleared</span>
                    )}
                  </td>
                  <td className="p-4">
                    {item.voucherReferences.length === 0 ? "—" : item.voucherReferences.map((voucher) => (
                      onOpenVoucher ? (
                        <button
                          key={voucher.id}
                          type="button"
                          className="mr-2 text-primary"
                          onClick={() => onOpenVoucher(voucher.voucherNumber)}
                        >
                          {voucher.voucherNumber}
                        </button>
                      ) : (
                        <span key={voucher.id} className="mr-2">{voucher.voucherNumber}</span>
                      )
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
