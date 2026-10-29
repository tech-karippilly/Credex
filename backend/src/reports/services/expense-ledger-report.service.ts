import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from '../../expense-categories/schemas/expense-category.schema';
import { ExpenseLedgerQueryDto } from '../dto/expense-ledger-query.dto';
import { EXPENSE_REPORT_NOTES } from '../financial-rules';
import {
  ExpenseFinancialReport,
  ExpenseReportItem,
  ReportGroup,
  ReportMeta,
} from '../interfaces/financial-report.interface';
import { Expense, ExpenseDocument } from '../../expenses/schemas/expense.schema';
import { buildExpenseFilter } from '../../expenses/utils/expense-filter.util';
import { formatExpenseDate } from '../../expenses/utils/expense-date.util';
import { paiseToInr } from '../../expenses/utils/money.util';
import {
  REPORT_EXPORT_MAX_ROWS,
  assertDateOrder,
  containsRegex,
  describedFilters,
  pageWindow,
  paginationMeta,
  reportPeriod,
} from '../utils/report-page.util';

interface ExpenseSummaryAggregate {
  totals: { count: number; amountPaise: number }[];
  byCategory: {
    _id: { categoryId: unknown; categoryName: string };
    count: number;
    amountPaise: number;
  }[];
  byDate: { _id: string; count: number; amountPaise: number }[];
}

@Injectable()
export class ExpenseLedgerReportService {
  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
  ) {}

  async generate(query: ExpenseLedgerQueryDto): Promise<ExpenseFinancialReport> {
    const filter = this.filterFor(query);
    const window = pageWindow(query.page, query.limit);
    const summary = await this.summarize(filter);
    const items = await this.findItems(filter, window.skip, window.limit);
    return {
      meta: await this.meta(query, summary.count, window),
      summary,
      items,
    };
  }

  async collectForExport(
    query: ExpenseLedgerQueryDto,
  ): Promise<ExpenseFinancialReport> {
    const filter = this.filterFor(query);
    const summary = await this.summarize(filter);
    this.assertExportSize(summary.count);
    const items = await this.findItems(filter, 0, summary.count);
    return {
      meta: await this.meta(query, summary.count, {
        page: 1,
        limit: Math.max(summary.count, 1),
      }),
      summary,
      items,
    };
  }

  private filterFor(query: ExpenseLedgerQueryDto): Record<string, unknown> {
    assertDateOrder(query.from, query.to);
    const filter = buildExpenseFilter({
      categoryId: query.categoryId,
      from: query.from,
      to: query.to,
      paidBy: query.paidBy,
    });
    if (query.search) {
      filter.expenseName = containsRegex(query.search);
    }
    return filter;
  }

  private async summarize(filter: Record<string, unknown>): Promise<
    ExpenseFinancialReport['summary']
  > {
    const [aggregated] = await this.expenseModel
      .aggregate<ExpenseSummaryAggregate>([
        { $match: filter },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                },
              },
            ],
            byCategory: [
              {
                $lookup: {
                  from: this.categoryModel.collection.collectionName,
                  localField: 'categoryId',
                  foreignField: '_id',
                  as: 'categoryDoc',
                },
              },
              {
                $group: {
                  _id: {
                    categoryId: '$categoryId',
                    categoryName: {
                      $ifNull: [
                        { $arrayElemAt: ['$categoryDoc.name', 0] },
                        'Unknown category',
                      ],
                    },
                  },
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                },
              },
              { $sort: { '_id.categoryName': 1 } },
            ],
            byDate: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$date',
                      timezone: 'UTC',
                    },
                  },
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ])
      .exec();

    const totals = aggregated?.totals[0];
    return {
      count: totals?.count ?? 0,
      expenseTotal: paiseToInr(totals?.amountPaise ?? 0),
      byCategory: (aggregated?.byCategory ?? []).map(
        (row): ReportGroup => ({
          key: String(row._id.categoryId ?? ''),
          label: row._id.categoryName,
          count: row.count,
          amount: paiseToInr(row.amountPaise),
        }),
      ),
      byDate: (aggregated?.byDate ?? []).map(
        (row): ReportGroup => ({
          key: row._id,
          label: row._id,
          count: row.count,
          amount: paiseToInr(row.amountPaise),
        }),
      ),
    };
  }

  private async findItems(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<ExpenseReportItem[]> {
    if (limit <= 0) return [];
    const expenses = await this.expenseModel
      .find(filter)
      .populate('categoryId')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return expenses.map((expense) => this.toItem(expense));
  }

  private toItem(expense: ExpenseDocument): ExpenseReportItem {
    const category = this.categoryOf(expense);
    const invoiceDate = formatExpenseDate(expense.date);
    return {
      id: expense._id.toString(),
      date: invoiceDate,
      invoiceDate,
      receivedDate: expense.receivedDate
        ? formatExpenseDate(expense.receivedDate)
        : null,
      expenseName: expense.expenseName,
      categoryId: category.id,
      categoryName: category.name,
      paidBy: expense.paidBy,
      amount: paiseToInr(expense.amountPaise),
      receiptAvailable: Boolean(expense.receipt?.url),
      receiptFileName: expense.receipt?.fileName ?? '',
      receiptUrl: expense.receipt?.url ?? null,
      notes: expense.notes ?? '',
    };
  }

  private categoryOf(expense: ExpenseDocument): { id: string; name: string } {
    const ref = expense.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | undefined;
    if (
      ref &&
      typeof ref === 'object' &&
      'name' in ref &&
      typeof ref.name === 'string'
    ) {
      const id =
        '_id' in ref && ref._id ? String(ref._id) : String(expense.categoryId);
      return { id, name: ref.name };
    }
    return {
      id: ref ? String(ref) : '',
      name: 'Unknown category',
    };
  }

  private async meta(
    query: ExpenseLedgerQueryDto,
    total: number,
    window: { page: number; limit: number },
  ): Promise<ReportMeta> {
    let categoryName: string | undefined;
    if (query.categoryId) {
      const category = await this.categoryModel
        .findById(query.categoryId)
        .select('name')
        .exec();
      categoryName = category?.name ?? 'Unknown category';
    }

    return {
      title: 'Expense report',
      period: reportPeriod(query.from, query.to),
      filters: describedFilters([
        { label: 'Date basis', value: 'Invoice date' },
        { label: 'Category', value: categoryName },
        { label: 'Paid by', value: query.paidBy },
        { label: 'Expense name', value: query.search },
      ]),
      generatedAt: new Date().toISOString(),
      notes: EXPENSE_REPORT_NOTES,
      pagination: paginationMeta(window.page, window.limit, total),
    };
  }

  private assertExportSize(count: number): void {
    if (count > REPORT_EXPORT_MAX_ROWS) {
      throw new BadRequestException(
        `This report has ${count} rows. Narrow the filters to export at most ${REPORT_EXPORT_MAX_ROWS} rows.`,
      );
    }
  }
}
