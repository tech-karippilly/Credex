import { apiDownload, apiRequest } from "./api";
import type { ReportFilterValues, ReportKind } from "./report-form";

export type ReportFilterLabel = { label: string; value: string };

export type ReportMeta = {
  title: string;
  period: { from: string | null; to: string | null; label: string };
  filters: ReportFilterLabel[];
  generatedAt: string;
  notes: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type ReportGroup = {
  key: string;
  label: string;
  count: number;
  amount: number;
};

export type PaymentMethodGroup = ReportGroup & { clearedAmount: number };

export type ExpenseReportItem = {
  id: string;
  date: string;
  expenseName: string;
  categoryId: string;
  categoryName: string;
  paidBy: string;
  amount: number;
  receiptAvailable: boolean;
  receiptFileName: string;
  receiptUrl: string | null;
  notes: string;
};

export type ExpenseFinancialReport = {
  meta: ReportMeta;
  summary: {
    count: number;
    expenseTotal: number;
    byCategory: ReportGroup[];
    byDate: ReportGroup[];
  };
  items: ExpenseReportItem[];
};

export type VoucherReportItem = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  voucherTypeLabel: string;
  title: string;
  payee: string;
  paymentMode: string;
  paymentModeLabel: string;
  amount: number;
  status: string;
  statusLabel: string;
  settlementStatus: string;
  settlementLabel: string;
  amountSettled: number;
  outstandingAmount: number;
  referenceNumber: string;
  expense: { id: string; expenseName: string } | null;
};

export type VoucherFinancialReport = {
  meta: ReportMeta;
  summary: {
    count: number;
    voucherTotal: number;
    settledTotal: number;
    outstandingTotal: number;
    byType: ReportGroup[];
    byStatus: ReportGroup[];
    byDate: ReportGroup[];
  };
  items: VoucherReportItem[];
};

export type PaymentReportItem = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  chequeNumber: string;
  chequeDate: string | null;
  referenceNumber: string;
  payee: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  status: string;
  statusLabel: string;
  countsAsCleared: boolean;
  voucherReferences: { id: string; voucherNumber: string }[];
};

export type PaymentFinancialReport = {
  meta: ReportMeta;
  summary: {
    count: number;
    recordedTotal: number;
    clearedTotal: number;
    allocatedTotal: number;
    unallocatedTotal: number;
    byMethod: PaymentMethodGroup[];
    byStatus: ReportGroup[];
  };
  items: PaymentReportItem[];
};

export type ReportQuery = ReportFilterValues & { page?: number; limit?: number };

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function expenseParams(query: ReportQuery): Record<string, string | number | undefined> {
  return {
    from: query.from,
    to: query.to,
    categoryId: query.categoryId,
    paidBy: query.paidBy,
    search: query.search,
    page: query.page,
    limit: query.limit,
  };
}

function voucherParams(query: ReportQuery): Record<string, string | number | undefined> {
  return {
    from: query.from,
    to: query.to,
    voucherType: query.voucherType,
    status: query.voucherStatus,
    payee: query.payee,
    paymentMode: query.paymentMode,
    reference: query.reference,
    page: query.page,
    limit: query.limit,
  };
}

function paymentParams(query: ReportQuery): Record<string, string | number | undefined> {
  return {
    from: query.from,
    to: query.to,
    paymentMethod: query.paymentMethod,
    status: query.paymentStatus,
    payee: query.payee,
    chequeNumber: query.chequeNumber,
    reference: query.reference,
    page: query.page,
    limit: query.limit,
  };
}

async function saveWorkbook(path: string): Promise<void> {
  const file = await apiDownload(path);
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const reportsApi = {
  expenses(query: ReportQuery): Promise<ExpenseFinancialReport> {
    return apiRequest<ExpenseFinancialReport>(`/reports/expenses${queryString(expenseParams(query))}`, {
      auth: true,
    });
  },

  vouchers(query: ReportQuery): Promise<VoucherFinancialReport> {
    return apiRequest<VoucherFinancialReport>(`/reports/vouchers${queryString(voucherParams(query))}`, {
      auth: true,
    });
  },

  payments(query: ReportQuery): Promise<PaymentFinancialReport> {
    return apiRequest<PaymentFinancialReport>(`/reports/payments${queryString(paymentParams(query))}`, {
      auth: true,
    });
  },

  exportReport(kind: ReportKind, query: ReportFilterValues): Promise<void> {
    const params =
      kind === "expenses"
        ? expenseParams(query)
        : kind === "vouchers"
          ? voucherParams(query)
          : paymentParams(query);
    const path = kind === "expenses" ? "expenses" : kind === "vouchers" ? "vouchers" : "payments";
    return saveWorkbook(`/reports/${path}/export${queryString(params)}`);
  },
};
