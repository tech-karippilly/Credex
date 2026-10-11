import { formatLedgerDate } from "./expense-form";

export type ReportKind = "expenses" | "vouchers" | "payments";

export type ReportFilterValues = {
  from: string;
  to: string;
  categoryId: string;
  paidBy: string;
  search: string;
  voucherType: string;
  voucherStatus: string;
  payee: string;
  paymentMode: string;
  reference: string;
  paymentMethod: string;
  paymentStatus: string;
  chequeNumber: string;
};

export function emptyReportFilters(): ReportFilterValues {
  return {
    from: "",
    to: "",
    categoryId: "",
    paidBy: "",
    search: "",
    voucherType: "",
    voucherStatus: "",
    payee: "",
    paymentMode: "",
    reference: "",
    paymentMethod: "",
    paymentStatus: "",
    chequeNumber: "",
  };
}

export function sameReportFilters(left: ReportFilterValues, right: ReportFilterValues): boolean {
  return (Object.keys(left) as (keyof ReportFilterValues)[]).every((key) => left[key] === right[key]);
}

export function formatReportPeriod(period: {
  from: string | null;
  to: string | null;
}): string {
  if (period.from && period.to) {
    return `${formatLedgerDate(period.from)} to ${formatLedgerDate(period.to)}`;
  }
  if (period.from) return `From ${formatLedgerDate(period.from)}`;
  if (period.to) return `Through ${formatLedgerDate(period.to)}`;
  return "All dates";
}
