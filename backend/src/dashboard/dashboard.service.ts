import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Expense,
  ExpenseDocument,
} from '../expenses/schemas/expense.schema';
import { buildExpenseFilter } from '../expenses/utils/expense-filter.util';
import { paiseToInr, sumPaiseToInr } from '../expenses/utils/money.util';
import { ExpensesByCategoryResponse } from './interfaces/expenses-by-category.interface';
import { ExpensesSummaryResponse } from './interfaces/expenses-summary.interface';

/** Max named categories before remaining amounts roll into "Other". */
const MAX_NAMED_CATEGORIES = 7;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async getExpensesSummary(month?: string): Promise<ExpensesSummaryResponse> {
    const selectedMonth = month ?? currentUtcMonthKey();
    const previousMonth = shiftMonthKey(selectedMonth, -1);

    const [current, previous] = await Promise.all([
      this.aggregateMonth(selectedMonth),
      this.aggregateMonth(previousMonth),
    ]);

    const changeAmount = current.totalAmount - previous.totalAmount;
    const changePercent =
      previous.totalAmount === 0
        ? null
        : Math.round((changeAmount / previous.totalAmount) * 10000) / 100;

    const { year, monthNumber } = parseMonthKey(selectedMonth);

    return {
      dateBasis: 'invoiceDate',
      month: selectedMonth,
      year,
      monthNumber,
      totalAmount: current.totalAmount,
      expenseCount: current.expenseCount,
      previousMonth: {
        month: previousMonth,
        totalAmount: previous.totalAmount,
        expenseCount: previous.expenseCount,
      },
      changeAmount,
      changePercent,
    };
  }

  async getExpensesByCategory(
    month?: string,
  ): Promise<ExpensesByCategoryResponse> {
    const selectedMonth = month ?? currentUtcMonthKey();
    // Sum expense.amountPaise only — never vouchers or payments.
    // Filter on expense.date (invoice / bill date), matching expense reports.
    const filter = buildExpenseFilter({ month: selectedMonth });

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
        { $sort: { totalPaise: -1, '_id.categoryName': 1 } },
      ])
      .exec();

    const totalPaise = aggregated.reduce(
      (sum, row) => sum + row.totalPaise,
      0,
    );
    const expenseCount = aggregated.reduce(
      (sum, row) => sum + row.expenseCount,
      0,
    );

    const named = aggregated.slice(0, MAX_NAMED_CATEGORIES);
    const remainder = aggregated.slice(MAX_NAMED_CATEGORIES);

    const categories = named.map((row) =>
      toCategoryRow(
        String(row._id.categoryId ?? ''),
        row._id.categoryName,
        row.totalPaise,
        row.expenseCount,
        totalPaise,
      ),
    );

    if (remainder.length > 0) {
      const otherPaise = remainder.reduce(
        (sum, row) => sum + row.totalPaise,
        0,
      );
      const otherCount = remainder.reduce(
        (sum, row) => sum + row.expenseCount,
        0,
      );
      categories.push(
        toCategoryRow('other', 'Other', otherPaise, otherCount, totalPaise),
      );
    }

    const { year, monthNumber } = parseMonthKey(selectedMonth);

    return {
      dateBasis: 'invoiceDate',
      month: selectedMonth,
      year,
      monthNumber,
      totalAmount: sumPaiseToInr(totalPaise),
      expenseCount,
      categories,
    };
  }

  private async aggregateMonth(month: string): Promise<{
    totalAmount: number;
    expenseCount: number;
  }> {
    // Sum expense.amountPaise only — never vouchers or payments.
    // Filter on expense.date (invoice / bill date), matching expense reports.
    const filter = buildExpenseFilter({ month });
    const [row] = await this.expenseModel
      .aggregate<{ totalPaise: number; expenseCount: number }>([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPaise: { $sum: '$amountPaise' },
            expenseCount: { $sum: 1 },
          },
        },
      ])
      .exec();

    return {
      totalAmount: sumPaiseToInr(row?.totalPaise ?? 0),
      expenseCount: row?.expenseCount ?? 0,
    };
  }
}

function toCategoryRow(
  categoryId: string,
  categoryName: string,
  totalPaise: number,
  expenseCount: number,
  periodTotalPaise: number,
) {
  return {
    categoryId,
    categoryName,
    totalAmount: paiseToInr(totalPaise),
    expenseCount,
    percent:
      periodTotalPaise === 0
        ? 0
        : Math.round((totalPaise / periodTotalPaise) * 10000) / 100,
  };
}

export function currentUtcMonthKey(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function shiftMonthKey(month: string, delta: number): string {
  const { year, monthNumber } = parseMonthKey(month);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return currentUtcMonthKey(shifted);
}

function parseMonthKey(month: string): { year: number; monthNumber: number } {
  const [yearPart, monthPart] = month.split('-');
  return {
    year: Number(yearPart),
    monthNumber: Number(monthPart),
  };
}
