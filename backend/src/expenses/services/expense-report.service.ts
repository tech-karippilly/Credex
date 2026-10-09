import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ExpenseReportQueryDto,
  ExpenseReportType,
} from '../dto/expense-report-query.dto';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import {
  buildExpenseFilterFromReportQuery,
  expenseDateKey,
  expenseMonthKey,
  reportMetaFromQuery,
} from '../utils/expense-filter.util';
import { paiseToInr, sumPaiseToInr } from '../utils/money.util';

export interface ReportRowBase {
  totalAmount: number;
  expenseCount: number;
}

export interface DateWiseReportRow extends ReportRowBase {
  date: string;
}

export interface MonthWiseReportRow extends ReportRowBase {
  month: string;
}

export interface CategoryWiseReportRow extends ReportRowBase {
  category: string;
  categoryId: string;
}

export type ExpenseReportData =
  | {
      type: 'date-wise';
      from?: string;
      to?: string;
      month?: string;
      rows: DateWiseReportRow[];
      grandTotal: number;
    }
  | {
      type: 'month-wise';
      from?: string;
      to?: string;
      month?: string;
      rows: MonthWiseReportRow[];
      grandTotal: number;
    }
  | {
      type: 'category-wise';
      from?: string;
      to?: string;
      month?: string;
      rows: CategoryWiseReportRow[];
      grandTotal: number;
    };

@Injectable()
export class ExpenseReportService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async generateReport(query: ExpenseReportQueryDto): Promise<ExpenseReportData> {
    const filter = buildExpenseFilterFromReportQuery(query);
    const meta = reportMetaFromQuery(query);

    switch (query.type) {
      case 'date-wise':
        return {
          type: 'date-wise',
          ...meta,
          ...(await this.buildDateWise(filter)),
        };
      case 'month-wise':
        return {
          type: 'month-wise',
          ...meta,
          ...(await this.buildMonthWise(filter)),
        };
      case 'category-wise':
        return {
          type: 'category-wise',
          ...meta,
          ...(await this.buildCategoryWise(filter)),
        };
      default:
        return {
          type: query.type as ExpenseReportType,
          ...meta,
          rows: [],
          grandTotal: 0,
        };
    }
  }

  async findExpensesForExport(
    query: ExpenseReportQueryDto,
  ): Promise<ExpenseDocument[]> {
    const filter = buildExpenseFilterFromReportQuery(query);
    return this.expenseModel
      .find(filter)
      .populate('categoryId')
      .sort({ date: 1, createdAt: 1 })
      .exec();
  }

  private async buildDateWise(filter: Record<string, unknown>): Promise<{
    rows: DateWiseReportRow[];
    grandTotal: number;
  }> {
    const expenses = await this.expenseModel.find(filter).exec();
    const map = new Map<string, { totalPaise: number; count: number }>();

    for (const expense of expenses) {
      const key = expenseDateKey(expense.date);
      const entry = map.get(key) ?? { totalPaise: 0, count: 0 };
      entry.totalPaise += expense.amountPaise;
      entry.count += 1;
      map.set(key, entry);
    }

    const rows = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        totalAmount: paiseToInr(value.totalPaise),
        expenseCount: value.count,
      }));

    const grandTotalPaise = expenses.reduce(
      (sum, item) => sum + item.amountPaise,
      0,
    );

    return {
      rows,
      grandTotal: sumPaiseToInr(grandTotalPaise),
    };
  }

  private async buildMonthWise(filter: Record<string, unknown>): Promise<{
    rows: MonthWiseReportRow[];
    grandTotal: number;
  }> {
    const expenses = await this.expenseModel.find(filter).exec();
    const map = new Map<string, { totalPaise: number; count: number }>();

    for (const expense of expenses) {
      const key = expenseMonthKey(expense.date);
      const entry = map.get(key) ?? { totalPaise: 0, count: 0 };
      entry.totalPaise += expense.amountPaise;
      entry.count += 1;
      map.set(key, entry);
    }

    const rows = [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        totalAmount: paiseToInr(value.totalPaise),
        expenseCount: value.count,
      }));

    const grandTotalPaise = expenses.reduce(
      (sum, item) => sum + item.amountPaise,
      0,
    );

    return {
      rows,
      grandTotal: sumPaiseToInr(grandTotalPaise),
    };
  }

  private async buildCategoryWise(filter: Record<string, unknown>): Promise<{
    rows: CategoryWiseReportRow[];
    grandTotal: number;
  }> {
    const aggregated = await this.expenseModel
      .aggregate<{
        _id: { categoryId: unknown; categoryName: string };
        totalPaise: number;
        expenseCount: number;
      }>([
        { $match: filter },
        {
          $lookup: {
            from: 'expense_categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryDoc',
          },
        },
        {
          $addFields: {
            categoryName: {
              $ifNull: [
                { $arrayElemAt: ['$categoryDoc.name', 0] },
                'Unknown category',
              ],
            },
          },
        },
        {
          $group: {
            _id: { categoryId: '$categoryId', categoryName: '$categoryName' },
            totalPaise: { $sum: '$amountPaise' },
            expenseCount: { $sum: 1 },
          },
        },
        { $sort: { '_id.categoryName': 1 } },
      ])
      .exec();

    const rows = aggregated.map((row) => ({
      categoryId: String(row._id.categoryId ?? ''),
      category: row._id.categoryName,
      totalAmount: paiseToInr(row.totalPaise),
      expenseCount: row.expenseCount,
    }));

    const grandTotalPaise = aggregated.reduce(
      (sum, row) => sum + row.totalPaise,
      0,
    );

    return {
      rows,
      grandTotal: sumPaiseToInr(grandTotalPaise),
    };
  }
}
