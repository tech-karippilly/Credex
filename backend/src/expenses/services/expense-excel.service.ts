import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ExpenseReportQueryDto } from '../dto/expense-report-query.dto';
import { ExpenseCategoryDocument } from '../../expense-categories/schemas/expense-category.schema';
import { ExpenseDocument } from '../schemas/expense.schema';
import { Types } from 'mongoose';
import { formatExpenseDate } from '../utils/expense-date.util';
import { paiseToInr } from '../utils/money.util';
import {
  ExpenseReportData,
  ExpenseReportService,
} from './expense-report.service';

export interface ExpenseExcelExport {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class ExpenseExcelService {
  constructor(private readonly expenseReportService: ExpenseReportService) {}

  async export(
    query: ExpenseReportQueryDto,
  ): Promise<ExpenseExcelExport> {
    const report = await this.expenseReportService.generateReport(query);
    const expenses =
      await this.expenseReportService.findExpensesForExport(query);

    const workbook = new ExcelJS.Workbook();
    const expensesSheet = workbook.addWorksheet('Expenses');
    expensesSheet.columns = [
      { header: 'Invoice date', key: 'invoiceDate', width: 14 },
      { header: 'Received date', key: 'receivedDate', width: 14 },
      { header: 'Expense Name', key: 'expenseName', width: 32 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Who Paid', key: 'paidBy', width: 22 },
      { header: 'Amount (INR)', key: 'amount', width: 16 },
      { header: 'Notes', key: 'notes', width: 36 },
      { header: 'Receipt File Name', key: 'receiptFileName', width: 28 },
    ];

    let totalPaise = 0;
    for (const expense of expenses) {
      totalPaise += expense.amountPaise;
      expensesSheet.addRow({
        invoiceDate: formatExpenseDate(expense.date),
        receivedDate: expense.receivedDate
          ? formatExpenseDate(expense.receivedDate)
          : '',
        expenseName: expense.expenseName,
        category: this.categoryNameForExport(expense),
        paidBy: expense.paidBy,
        amount: paiseToInr(expense.amountPaise),
        notes: expense.notes ?? '',
        receiptFileName: expense.receipt?.fileName ?? '',
      });
    }

    const amountColumn = expensesSheet.getColumn('amount');
    amountColumn.numFmt = '#,##0.00';

    expensesSheet.addRow({});
    const totalRow = expensesSheet.addRow({
      invoiceDate: '',
      receivedDate: '',
      expenseName: '',
      category: '',
      paidBy: 'Total Amount',
      amount: paiseToInr(totalPaise),
      notes: '',
      receiptFileName: '',
    });
    totalRow.font = { bold: true };

    const summarySheet = workbook.addWorksheet('Summary');
    this.writeSummarySheet(summarySheet, report);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const filename = this.buildFilename(query);

    return { buffer, filename };
  }

  private writeSummarySheet(
    sheet: ExcelJS.Worksheet,
    report: ExpenseReportData,
  ): void {
    if (report.type === 'date-wise') {
      sheet.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Expense Count', key: 'expenseCount', width: 16 },
        { header: 'Total Amount', key: 'totalAmount', width: 18 },
      ];
      for (const row of report.rows) {
        sheet.addRow(row);
      }
    } else if (report.type === 'month-wise') {
      sheet.columns = [
        { header: 'Month', key: 'month', width: 14 },
        { header: 'Expense Count', key: 'expenseCount', width: 16 },
        { header: 'Total Amount', key: 'totalAmount', width: 18 },
      ];
      for (const row of report.rows) {
        sheet.addRow(row);
      }
    } else {
      sheet.columns = [
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Expense Count', key: 'expenseCount', width: 16 },
        { header: 'Total Amount', key: 'totalAmount', width: 18 },
      ];
      for (const row of report.rows) {
        sheet.addRow(row);
      }
    }

    sheet.addRow({});
    const totalRow = sheet.addRow({
      date: '',
      month: '',
      category: 'Grand Total',
      expenseCount: '',
      totalAmount: report.grandTotal,
    });
    totalRow.font = { bold: true };
    sheet.getColumn('totalAmount').numFmt = '#,##0.00';
  }

  private categoryNameForExport(expense: ExpenseDocument): string {
    const categoryRef = expense.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | undefined;

    if (
      categoryRef &&
      typeof categoryRef === 'object' &&
      'name' in categoryRef &&
      typeof categoryRef.name === 'string'
    ) {
      return categoryRef.name;
    }

    return 'Unknown category';
  }

  private buildFilename(query: ExpenseReportQueryDto): string {
    const suffix =
      query.month ??
      (query.from && query.to
        ? `${query.from}_to_${query.to}`
        : new Date().toISOString().slice(0, 7));

    return `credex-expenses-${query.type}-${suffix}.xlsx`;
  }
}
