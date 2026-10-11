import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { formatExpenseDate } from '../../expenses/utils/expense-date.util';
import { paiseToInr } from '../../expenses/utils/money.util';
import { SETTLING_STATUSES } from '../../payments/constants/payment.constants';
import { PaymentReportQueryDto } from '../dto/payment-report-query.dto';
import { PAYMENT_REPORT_NOTES } from '../financial-rules';
import {
  PaymentAllocationReportRow,
  PaymentFinancialReport,
  PaymentMethodGroup,
  PaymentReportExport,
  PaymentReportItem,
  PaymentVoucherReference,
  ReportGroup,
  ReportMeta,
} from '../interfaces/financial-report.interface';
import {
  PaymentAllocation,
  PaymentAllocationDocument,
} from '../../payments/schemas/payment-allocation.schema';
import { Payment, PaymentDocument } from '../../payments/schemas/payment.schema';
import { countsAsSettled } from '../../payments/utils/payment-rules';
import { buildPaymentFieldFilter } from '../../payments/utils/payment-filter.util';
import { Voucher, VoucherDocument } from '../../vouchers/schemas/voucher.schema';
import { methodLabel, paymentStatusLabel } from '../utils/report-labels';
import {
  REPORT_EXPORT_MAX_ROWS,
  describedFilters,
  pageWindow,
  paginationMeta,
  reportPeriod,
} from '../utils/report-page.util';

interface PaymentSummaryAggregate {
  totals: {
    count: number;
    amountPaise: number;
    clearedPaise: number;
    allocatedPaise: number;
    unallocatedPaise: number;
  }[];
  byMethod: {
    _id: string;
    count: number;
    amountPaise: number;
    clearedPaise: number;
  }[];
  byStatus: { _id: string; count: number; amountPaise: number }[];
}

@Injectable()
export class PaymentReportService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(PaymentAllocation.name)
    private readonly allocationModel: Model<PaymentAllocationDocument>,
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
  ) {}

  async generate(query: PaymentReportQueryDto): Promise<PaymentFinancialReport> {
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

  async collectForExport(query: PaymentReportQueryDto): Promise<PaymentReportExport> {
    const filter = this.filterFor(query);
    const summary = await this.summarize(filter);
    this.assertExportSize(summary.count);
    const loaded = await this.loadItems(filter, 0, summary.count, true);
    return {
      meta: this.meta(query, summary.count, {
        page: 1,
        limit: Math.max(summary.count, 1),
      }),
      summary,
      items: loaded.items,
      allocations: loaded.allocations,
    };
  }

  private filterFor(query: PaymentReportQueryDto): Record<string, unknown> {
    return buildPaymentFieldFilter({
      paymentMethod: query.paymentMethod,
      status: query.status,
      payee: query.payee,
      chequeNumber: query.chequeNumber,
      reference: query.reference,
      from: query.from,
      to: query.to,
    });
  }

  private async summarize(
    filter: Record<string, unknown>,
  ): Promise<PaymentFinancialReport['summary']> {
    const clearedPaise = () => ({
      $cond: [
        { $in: ['$status', [...SETTLING_STATUSES]] },
        '$amountPaise',
        0,
      ],
    });
    const [aggregated] = await this.paymentModel
      .aggregate<PaymentSummaryAggregate>([
        { $match: filter },
        {
          $lookup: {
            from: this.allocationModel.collection.collectionName,
            localField: '_id',
            foreignField: 'paymentId',
            as: 'allocationRows',
          },
        },
        {
          $addFields: {
            allocatedPaise: { $sum: '$allocationRows.amountPaise' },
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
                  clearedPaise: { $sum: clearedPaise() },
                  allocatedPaise: { $sum: '$allocatedPaise' },
                  unallocatedPaise: {
                    $sum: {
                      $subtract: ['$amountPaise', '$allocatedPaise'],
                    },
                  },
                },
              },
            ],
            byMethod: [
              {
                $group: {
                  _id: '$paymentMethod',
                  count: { $sum: 1 },
                  amountPaise: { $sum: '$amountPaise' },
                  clearedPaise: { $sum: clearedPaise() },
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
          },
        },
      ])
      .exec();

    const totals = aggregated?.totals[0];
    return {
      count: totals?.count ?? 0,
      recordedTotal: paiseToInr(totals?.amountPaise ?? 0),
      clearedTotal: paiseToInr(totals?.clearedPaise ?? 0),
      allocatedTotal: paiseToInr(totals?.allocatedPaise ?? 0),
      unallocatedTotal: paiseToInr(totals?.unallocatedPaise ?? 0),
      byMethod: (aggregated?.byMethod ?? []).map(
        (row): PaymentMethodGroup => ({
          key: row._id,
          label: methodLabel(row._id),
          count: row.count,
          amount: paiseToInr(row.amountPaise),
          clearedAmount: paiseToInr(row.clearedPaise),
        }),
      ),
      byStatus: (aggregated?.byStatus ?? []).map(
        (row): ReportGroup => ({
          key: row._id,
          label: paymentStatusLabel(row._id),
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
  ): Promise<PaymentReportItem[]> {
    const loaded = await this.loadItems(filter, skip, limit, false);
    return loaded.items;
  }

  private async loadItems(
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
    withAllocationRows: boolean,
  ): Promise<{
    items: PaymentReportItem[];
    allocations: PaymentAllocationReportRow[];
  }> {
    if (limit <= 0) return { items: [], allocations: [] };
    const payments = await this.paymentModel
      .find(filter)
      .select('-sourceAccount -sourceAccountNormalized -createdByEmail -createdByUserId')
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    const links = await this.linksFor(payments);
    const items = payments.map((payment) => {
      const link = links.get(payment._id.toString()) ?? {
        allocatedPaise: 0,
        vouchers: [],
      };
      return this.toItem(payment, link.allocatedPaise, link.vouchers);
    });
    const allocations = withAllocationRows
      ? items.flatMap((item) =>
          item.voucherReferences.map((voucher) => ({
            paymentNumber: item.paymentNumber,
            paymentDate: item.paymentDate,
            statusLabel: item.statusLabel,
            voucherNumber: voucher.voucherNumber,
            amount: this.allocationAmount(links, item.id, voucher.id),
          })),
        )
      : [];
    return { items, allocations };
  }

  private allocationAmount(
    links: Map<
      string,
      {
        allocatedPaise: number;
        vouchers: PaymentVoucherReference[];
        amounts: Map<string, number>;
      }
    >,
    paymentId: string,
    voucherId: string,
  ): number {
    return paiseToInr(links.get(paymentId)?.amounts.get(voucherId) ?? 0);
  }

  private async linksFor(payments: PaymentDocument[]): Promise<
    Map<
      string,
      {
        allocatedPaise: number;
        vouchers: PaymentVoucherReference[];
        amounts: Map<string, number>;
      }
    >
  > {
    const ids = payments.map((payment) => payment._id);
    const rows = await this.allocationModel
      .find({ paymentId: { $in: ids } })
      .select('paymentId voucherId amountPaise')
      .exec();
    const voucherIds = [...new Set(rows.map((row) => row.voucherId.toString()))];
    const vouchers = await this.voucherModel
      .find({ _id: { $in: voucherIds.map((id) => new Types.ObjectId(id)) } })
      .select('voucherNumber')
      .exec();
    const numbers = new Map(
      vouchers.map((voucher) => [voucher._id.toString(), voucher.voucherNumber]),
    );
    const grouped = new Map<
      string,
      {
        allocatedPaise: number;
        vouchers: PaymentVoucherReference[];
        amounts: Map<string, number>;
      }
    >();

    for (const row of rows) {
      const paymentId = row.paymentId.toString();
      const voucherId = row.voucherId.toString();
      const current = grouped.get(paymentId) ?? {
        allocatedPaise: 0,
        vouchers: [],
        amounts: new Map<string, number>(),
      };
      current.allocatedPaise += row.amountPaise;
      current.amounts.set(voucherId, row.amountPaise);
      current.vouchers.push({
        id: voucherId,
        voucherNumber: numbers.get(voucherId) ?? 'Voucher unavailable',
      });
      grouped.set(paymentId, current);
    }

    for (const group of grouped.values()) {
      group.vouchers.sort((a, b) => a.voucherNumber.localeCompare(b.voucherNumber));
    }
    return grouped;
  }

  private toItem(
    payment: PaymentDocument,
    allocatedPaise: number,
    vouchers: PaymentVoucherReference[],
  ): PaymentReportItem {
    return {
      id: payment._id.toString(),
      paymentNumber: payment.paymentNumber,
      paymentDate: formatExpenseDate(payment.paymentDate),
      paymentMethod: payment.paymentMethod,
      paymentMethodLabel: methodLabel(payment.paymentMethod),
      chequeNumber: payment.chequeNumber ?? '',
      chequeDate: payment.chequeDate ? formatExpenseDate(payment.chequeDate) : null,
      referenceNumber: payment.referenceNumber ?? '',
      payee: payment.payee,
      amount: paiseToInr(payment.amountPaise),
      allocatedAmount: paiseToInr(allocatedPaise),
      unallocatedAmount: paiseToInr(payment.amountPaise - allocatedPaise),
      status: payment.status,
      statusLabel: paymentStatusLabel(payment.status),
      countsAsCleared: countsAsSettled(payment.status),
      voucherReferences: vouchers,
    };
  }

  private meta(
    query: PaymentReportQueryDto,
    total: number,
    window: { page: number; limit: number },
  ): ReportMeta {
    return {
      title: 'Payment report',
      period: reportPeriod(query.from, query.to),
      filters: describedFilters([
        {
          label: 'Payment method',
          value: query.paymentMethod
            ? methodLabel(query.paymentMethod)
            : undefined,
        },
        {
          label: 'Payment status',
          value: query.status ? paymentStatusLabel(query.status) : undefined,
        },
        { label: 'Payee', value: query.payee },
        { label: 'Cheque number', value: query.chequeNumber },
        { label: 'UTR or reference', value: query.reference },
      ]),
      generatedAt: new Date().toISOString(),
      notes: PAYMENT_REPORT_NOTES,
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
