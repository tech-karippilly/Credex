import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../../expenses/schemas/expense.schema';
import { paiseToInr } from '../../expenses/utils/money.util';
import { VoucherReportQueryDto } from '../dto/voucher-report-query.dto';
import { VOUCHER_REPORT_NOTES } from '../financial-rules';
import {
  ReportGroup,
  ReportMeta,
  VoucherFinancialReport,
  VoucherReportItem,
} from '../interfaces/financial-report.interface';
import { Voucher, VoucherDocument } from '../../vouchers/schemas/voucher.schema';
import { buildVoucherFilterFromQuery } from '../../vouchers/utils/voucher-filter.util';
import { formatExpenseDate } from '../../expenses/utils/expense-date.util';
import {
  methodLabel,
  voucherSettlement,
  voucherStatusLabel,
  voucherTypeLabel,
} from '../utils/report-labels';
import {
  REPORT_EXPORT_MAX_ROWS,
  assertDateOrder,
  containsRegex,
  describedFilters,
  pageWindow,
  paginationMeta,
  reportPeriod,
} from '../utils/report-page.util';

interface VoucherSummaryAggregate {
  totals: {
    count: number;
    amountPaise: number;
    settledPaise: number;
    outstandingPaise: number;
  }[];
  byType: { _id: string; count: number; amountPaise: number }[];
  byStatus: { _id: string; count: number; amountPaise: number }[];
  byDate: { _id: string; count: number; amountPaise: number }[];
}

@Injectable()
export class VoucherReportService {
  constructor(
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
  ) {}

  async generate(query: VoucherReportQueryDto): Promise<VoucherFinancialReport> {
    const filter = this.filterFor(query);
    const window = pageWindow(query.page, query.limit);
    const summary = await this.summarize(filter);
    const items = await this.findItems(filter, window.skip, window.limit);
    return {
      meta: this.meta(query, summary.count, window),
      summary,
      items,
    };
  }

  async collectForExport(
    query: VoucherReportQueryDto,
  ): Promise<VoucherFinancialReport> {
    const filter = this.filterFor(query);
    const summary = await this.summarize(filter);
    this.assertExportSize(summary.count);
    const items = await this.findItems(filter, 0, summary.count);
    return {
      meta: this.meta(query, summary.count, {
        page: 1,
        limit: Math.max(summary.count, 1),
      }),
      summary,
      items,
    };
  }

  private filterFor(query: VoucherReportQueryDto): Record<string, unknown> {
    assertDateOrder(query.from, query.to);
    const filter = buildVoucherFilterFromQuery({
      voucherType: query.voucherType,
      status: query.status,
      paymentMode: query.paymentMode,
      from: query.from,
      to: query.to,
    });
    if (query.payee) {
      filter.payee = containsRegex(query.payee);
    }
    if (query.reference) {
      const pattern = containsRegex(query.reference);
      filter.$and = [
        ...(Array.isArray(filter.$and) ? filter.$and : []),
        {
          $or: [{ voucherNumber: pattern }, { referenceNumber: pattern }],
        },
      ];
    }
    return filter;
  }

  private async summarize(
    filter: Record<string, unknown>,
  ): Promise<VoucherFinancialReport['summary']> {
    const settled = { $ifNull: ['$settledPaise', 0] };
    const outstanding = {
      $max: [0, { $subtract: ['$amountPaise', settled] }],
    };
    const [aggregated] = await this.voucherModel
      .aggregate<VoucherSummaryAggregate>([
        { $match: filter },
        {
          $addFields: {
            settledPaiseSafe: settled,
            outstandingPaiseSafe: outstanding,
          },
        },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                  settledPaise: { $sum: '$settledPaiseSafe' },
                  outstandingPaise: { $sum: '$outstandingPaiseSafe' },
                },
              },
            ],
            byType: [
              {
                $group: {
                  _id: '$voucherType',
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                },
              },
              { $sort: { _id: 1 } },
            ],
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                },
              },
              { $sort: { _id: 1 } },
            ],
            byDate: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$voucherDate',
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
    const group = (
      rows: { _id: string; count: number; amountPaise: number }[] | undefined,
      labelFor: (key: string) => string,
    ): ReportGroup[] =>
      (rows ?? []).map((row) => ({
        key: row._id,
        label: labelFor(row._id),
        count: row.count,
        amount: paiseToInr(row.amountPaise),
      }));

    return {
      count: totals?.count ?? 0,
      voucherTotal: paiseToInr(totals?.amountPaise ?? 0),
      settledTotal: paiseToInr(totals?.settledPaise ?? 0),
      outstandingTotal: paiseToInr(totals?.outstandingPaise ?? 0),
      byType: group(aggregated?.byType, voucherTypeLabel),
      byStatus: group(aggregated?.byStatus, voucherStatusLabel),
      byDate: group(aggregated?.byDate, (key) => key),
    };
  }

  private async findItems(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<VoucherReportItem[]> {
    if (limit <= 0) return [];
    const vouchers = await this.voucherModel
      .find(filter)
      .populate('expenseId')
      .sort({ voucherDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return vouchers.map((voucher) => this.toItem(voucher));
  }

  private toItem(voucher: VoucherDocument): VoucherReportItem {
    const settlement = voucherSettlement(
      voucher.amountPaise,
      voucher.settledPaise,
    );
    return {
      id: voucher._id.toString(),
      voucherNumber: voucher.voucherNumber,
      voucherDate: formatExpenseDate(voucher.voucherDate),
      voucherType: voucher.voucherType,
      voucherTypeLabel: voucherTypeLabel(voucher.voucherType),
      title: voucher.title,
      payee: voucher.payee,
      paymentMode: voucher.paymentMode,
      paymentModeLabel: methodLabel(voucher.paymentMode),
      amount: paiseToInr(voucher.amountPaise),
      status: voucher.status,
      statusLabel: voucherStatusLabel(voucher.status),
      referenceNumber: voucher.referenceNumber ?? '',
      expense: this.expenseOf(voucher),
      ...settlement,
    };
  }

  private expenseOf(
    voucher: VoucherDocument,
  ): { id: string; expenseName: string } | null {
    const ref = voucher.expenseId as ExpenseDocument | Types.ObjectId | null;
    if (!ref) return null;
    if (
      typeof ref === 'object' &&
      '_id' in ref &&
      ref._id &&
      'expenseName' in ref &&
      typeof ref.expenseName === 'string'
    ) {
      return { id: ref._id.toString(), expenseName: ref.expenseName };
    }
    const id = ref instanceof Types.ObjectId ? ref.toString() : String(ref);
    return { id, expenseName: 'Expense record unavailable' };
  }

  private meta(
    query: VoucherReportQueryDto,
    total: number,
    window: { page: number; limit: number },
  ): ReportMeta {
    return {
      title: 'Voucher report',
      period: reportPeriod(query.from, query.to),
      filters: describedFilters([
        { label: 'Date basis', value: 'Voucher date' },
        {
          label: 'Voucher type',
          value: query.voucherType
            ? voucherTypeLabel(query.voucherType)
            : undefined,
        },
        {
          label: 'Voucher status',
          value: query.status ? voucherStatusLabel(query.status) : undefined,
        },
        { label: 'Payee', value: query.payee },
        {
          label: 'Payment method',
          value: query.paymentMode ? methodLabel(query.paymentMode) : undefined,
        },
        { label: 'Voucher number or reference', value: query.reference },
      ]),
      generatedAt: new Date().toISOString(),
      notes: VOUCHER_REPORT_NOTES,
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
