export interface ReportFilterLabel {
  label: string;
  value: string;
}

export interface ReportPeriod {
  from: string | null;
  to: string | null;
  label: string;
}

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ReportMeta {
  title: string;
  period: ReportPeriod;
  filters: ReportFilterLabel[];
  generatedAt: string;
  notes: string[];
  pagination: ReportPagination;
}

export interface ReportGroup {
  key: string;
  label: string;
  count: number;
  amount: number;
}

export interface PaymentMethodGroup extends ReportGroup {
  clearedAmount: number;
}

export interface ExpenseReportItem {
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
}

export interface ExpenseFinancialReport {
  meta: ReportMeta;
  summary: {
    count: number;
    expenseTotal: number;
    byCategory: ReportGroup[];
    byDate: ReportGroup[];
  };
  items: ExpenseReportItem[];
}

export interface VoucherReportItem {
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
}

export interface VoucherFinancialReport {
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
}

export interface PaymentVoucherReference {
  id: string;
  voucherNumber: string;
}

export interface PaymentReportItem {
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
  voucherReferences: PaymentVoucherReference[];
}

export interface PaymentAllocationReportRow {
  paymentNumber: string;
  paymentDate: string;
  statusLabel: string;
  voucherNumber: string;
  amount: number;
}

export interface PaymentFinancialReport {
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
}

export interface PaymentReportExport extends PaymentFinancialReport {
  allocations: PaymentAllocationReportRow[];
}
