import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ExpenseLedgerQueryDto } from '../dto/expense-ledger-query.dto';
import { PaymentReportQueryDto } from '../dto/payment-report-query.dto';
import { VoucherReportQueryDto } from '../dto/voucher-report-query.dto';
import {
  ExpenseFinancialReport,
  PaymentReportExport,
  ReportGroup,
  ReportMeta,
  VoucherFinancialReport,
} from '../interfaces/financial-report.interface';
import { ExpenseLedgerReportService } from './expense-ledger-report.service';
import { PaymentReportService } from './payment-report.service';
import { VoucherReportService } from './voucher-report.service';

export interface ReportWorkbook {
  buffer: Buffer;
  filename: string;
}

const AMOUNT_FORMAT = '#,##0.00';
const COUNT_LABELS = new Set(['Expenses', 'Vouchers', 'Payments']);

@Injectable()
export class ReportExcelService {
  constructor(
    private readonly expenseReports: ExpenseLedgerReportService,
    private readonly voucherReports: VoucherReportService,
    private readonly paymentReports: PaymentReportService,
  ) {}

  async exportExpenses(query: ExpenseLedgerQueryDto): Promise<ReportWorkbook> {
    const report = await this.expenseReports.collectForExport(query);
    const workbook = new ExcelJS.Workbook();
    this.addCover(workbook, report.meta, [
      ['Expenses', report.summary.count],
      ['Expense total', report.summary.expenseTotal],
    ]);
    this.addSheet(
      workbook,
      'Expenses',
      [
        { header: 'Invoice date', key: 'invoiceDate', width: 14 },
        { header: 'Received date', key: 'receivedDate', width: 14 },
        { header: 'Expense name', key: 'expenseName', width: 32 },
        { header: 'Category', key: 'categoryName', width: 20 },
        { header: 'Paid by', key: 'paidBy', width: 22 },
        { header: 'Amount (INR)', key: 'amount', width: 16 },
        { header: 'Receipt', key: 'receipt', width: 12 },
        { header: 'Receipt file', key: 'receiptFileName', width: 28 },
        { header: 'Notes', key: 'notes', width: 36 },
      ],
      report.items.map((item) => ({
        invoiceDate: item.invoiceDate,
        receivedDate: item.receivedDate ?? '',
        expenseName: item.expenseName,
        categoryName: item.categoryName,
        paidBy: item.paidBy,
        amount: item.amount,
        receipt: item.receiptAvailable ? 'Yes' : 'No',
        receiptFileName: item.receiptFileName,
        notes: item.notes,
      })),
      ['amount'],
    );
    this.addSummarySheet(workbook, [
      {
        title: 'Category totals',
        rows: report.summary.byCategory,
      },
      {
        title: 'Invoice date totals',
        rows: report.summary.byDate,
      },
    ]);
    return this.finish(workbook, 'expense', report);
  }

  async exportVouchers(query: VoucherReportQueryDto): Promise<ReportWorkbook> {
    const report = await this.voucherReports.collectForExport(query);
    const workbook = new ExcelJS.Workbook();
    this.addCover(workbook, report.meta, [
      ['Vouchers', report.summary.count],
      ['Voucher total', report.summary.voucherTotal],
      ['Amount settled', report.summary.settledTotal],
      ['Outstanding voucher balance', report.summary.outstandingTotal],
    ]);
    this.addSheet(
      workbook,
      'Vouchers',
      [
        { header: 'Voucher number', key: 'voucherNumber', width: 20 },
        { header: 'Voucher date', key: 'voucherDate', width: 14 },
        { header: 'Type', key: 'voucherTypeLabel', width: 14 },
        { header: 'Title', key: 'title', width: 28 },
        { header: 'Payee', key: 'payee', width: 22 },
        { header: 'Payment method', key: 'paymentModeLabel', width: 18 },
        { header: 'Voucher amount (INR)', key: 'amount', width: 20 },
        { header: 'Status', key: 'statusLabel', width: 14 },
        { header: 'Settlement', key: 'settlementLabel', width: 16 },
        { header: 'Amount settled (INR)', key: 'amountSettled', width: 20 },
        { header: 'Outstanding (INR)', key: 'outstandingAmount', width: 18 },
        { header: 'Reference', key: 'referenceNumber', width: 18 },
        { header: 'Linked expense', key: 'expenseName', width: 28 },
      ],
      report.items.map((item) => ({
        ...item,
        expenseName: item.expense?.expenseName ?? '',
      })),
      ['amount', 'amountSettled', 'outstandingAmount'],
    );
    this.addSummarySheet(workbook, [
      { title: 'Totals by type', rows: report.summary.byType },
      { title: 'Totals by status', rows: report.summary.byStatus },
      { title: 'Voucher date totals', rows: report.summary.byDate },
    ]);
    return this.finish(workbook, 'voucher', report);
  }

  async exportPayments(query: PaymentReportQueryDto): Promise<ReportWorkbook> {
    const report = await this.paymentReports.collectForExport(query);
    const workbook = new ExcelJS.Workbook();
    this.addCover(workbook, report.meta, [
      ['Payments', report.summary.count],
      ['Recorded payment total', report.summary.recordedTotal],
      ['Cleared / settled amount', report.summary.clearedTotal],
      ['Allocated amount', report.summary.allocatedTotal],
      ['Unallocated amount', report.summary.unallocatedTotal],
    ]);
    this.addSheet(
      workbook,
      'Payments',
      [
        { header: 'Payment date', key: 'paymentDate', width: 14 },
        { header: 'Payment reference', key: 'paymentNumber', width: 22 },
        { header: 'Payment method', key: 'paymentMethodLabel', width: 18 },
        { header: 'Cheque number', key: 'chequeNumber', width: 16 },
        { header: 'Cheque date', key: 'chequeDate', width: 14 },
        { header: 'UTR or reference', key: 'referenceNumber', width: 20 },
        { header: 'Payee', key: 'payee', width: 22 },
        { header: 'Payment amount (INR)', key: 'amount', width: 20 },
        { header: 'Allocated amount (INR)', key: 'allocatedAmount', width: 22 },
        { header: 'Unallocated amount (INR)', key: 'unallocatedAmount', width: 24 },
        { header: 'Status', key: 'statusLabel', width: 14 },
        { header: 'Counts as cleared', key: 'cleared', width: 18 },
        { header: 'Linked vouchers', key: 'vouchers', width: 32 },
      ],
      report.items.map((item) => ({
        ...item,
        chequeDate: item.chequeDate ?? '',
        cleared: item.countsAsCleared ? 'Yes' : 'No',
        vouchers: item.voucherReferences
          .map((voucher) => voucher.voucherNumber)
          .join(', '),
      })),
      ['amount', 'allocatedAmount', 'unallocatedAmount'],
    );
    this.addSheet(
      workbook,
      'Allocations',
      [
        { header: 'Payment reference', key: 'paymentNumber', width: 22 },
        { header: 'Payment date', key: 'paymentDate', width: 14 },
        { header: 'Payment status', key: 'statusLabel', width: 16 },
        { header: 'Voucher number', key: 'voucherNumber', width: 20 },
        { header: 'Allocated amount (INR)', key: 'amount', width: 22 },
      ],
      report.allocations,
      ['amount'],
    );
    const summary = workbook.addWorksheet('Summary');
    this.writeGroupTable(summary, 'Totals by payment method', report.summary.byMethod, true);
    summary.addRow([]);
    this.writeGroupTable(summary, 'Totals by payment status', report.summary.byStatus, false);
    summary.getColumn(1).width = 28;
    summary.getColumn(2).width = 14;
    summary.getColumn(3).width = 22;
    summary.getColumn(4).width = 22;
    return this.finish(workbook, 'payment', report);
  }

  private addCover(
    workbook: ExcelJS.Workbook,
    meta: ReportMeta,
    totals: [string, number][],
  ): void {
    const sheet = workbook.addWorksheet('Report');
    sheet.addRow([meta.title]);
    sheet.getRow(1).font = { bold: true, size: 16 };
    sheet.addRow(['Period', meta.period.label]);
    sheet.addRow(['Generated at', meta.generatedAt]);
    sheet.addRow([]);
    sheet.addRow(['Filters']);
    sheet.getRow(sheet.rowCount).font = { bold: true };
    if (meta.filters.length === 0) {
      sheet.addRow(['None']);
    } else {
      for (const filter of meta.filters) {
        sheet.addRow([filter.label, filter.value]);
      }
    }
    sheet.addRow([]);
    sheet.addRow(['Summary']);
    sheet.getRow(sheet.rowCount).font = { bold: true };
    for (const [label, value] of totals) {
      const row = sheet.addRow([label, value]);
      if (!COUNT_LABELS.has(label)) {
        row.getCell(2).numFmt = AMOUNT_FORMAT;
      }
    }
    sheet.addRow([]);
    sheet.addRow(['Calculation notes']);
    sheet.getRow(sheet.rowCount).font = { bold: true };
    for (const note of meta.notes) {
      sheet.addRow([note]);
    }
    sheet.getColumn(1).width = 42;
    sheet.getColumn(2).width = 88;
  }

  private addSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: { header: string; key: string; width: number }[],
    rows: object[],
    amountKeys: string[],
  ): void {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    for (const row of rows) sheet.addRow(row);
    sheet.getRow(1).font = { bold: true };
    for (const key of amountKeys) {
      sheet.getColumn(key).numFmt = AMOUNT_FORMAT;
    }
  }

  private addSummarySheet(
    workbook: ExcelJS.Workbook,
    sections: { title: string; rows: ReportGroup[] }[],
  ): void {
    const sheet = workbook.addWorksheet('Summary');
    for (const section of sections) {
      this.writeGroupTable(sheet, section.title, section.rows, false);
      sheet.addRow([]);
    }
    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 14;
    sheet.getColumn(3).width = 18;
  }

  private writeGroupTable(
    sheet: ExcelJS.Worksheet,
    title: string,
    rows: (ReportGroup & { clearedAmount?: number })[],
    includeCleared: boolean,
  ): void {
    const titleRow = sheet.addRow([title]);
    titleRow.font = { bold: true };
    const header = includeCleared
      ? ['Group', 'Count', 'Recorded amount (INR)', 'Cleared amount (INR)']
      : ['Group', 'Count', 'Amount (INR)'];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };
    for (const row of rows) {
      const values = includeCleared
        ? [row.label, row.count, row.amount, row.clearedAmount ?? 0]
        : [row.label, row.count, row.amount];
      const added = sheet.addRow(values);
      added.getCell(3).numFmt = AMOUNT_FORMAT;
      if (includeCleared) added.getCell(4).numFmt = AMOUNT_FORMAT;
    }
    if (rows.length === 0) sheet.addRow(['None']);
  }

  private async finish(
    workbook: ExcelJS.Workbook,
    kind: string,
    report: ExpenseFinancialReport | VoucherFinancialReport | PaymentReportExport,
  ): Promise<ReportWorkbook> {
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const { from, to } = report.meta.period;
    const period =
      from && to
        ? `${from}_to_${to}`
        : from
          ? `from_${from}`
          : to
            ? `to_${to}`
            : 'all-dates';
    return {
      buffer,
      filename: `credex-${kind}-report-${period}.xlsx`,
    };
  }
}
