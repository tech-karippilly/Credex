import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { ExpenseCategoryDocument } from '../expense-categories/schemas/expense-category.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Voucher, VoucherDocument } from '../vouchers/schemas/voucher.schema';
import { EXPENSE_CURRENCY, EXPENSE_RECEIPT_FOLDER } from './constants/expense-categories';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  ExpenseListResponse,
  ExpenseResponse,
  ExpenseVoucherCounts,
} from './interfaces/expense-response.interface';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { buildExpenseFilterFromQuery } from './utils/expense-filter.util';
import { formatExpenseDate, parseExpenseDate } from './utils/expense-date.util';
import {
  ACTIVE_VOUCHER_STATUSES,
  computeExpenseVoucherLinkage,
  LinkedVoucherSummaryInput,
} from './utils/expense-voucher.util';
import { inrToPaise, paiseToInr, sumPaiseToInr } from './utils/money.util';

type VoucheredSumRow = {
  _id: Types.ObjectId;
  voucheredPaise: number;
};

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  toResponse(
    expense: ExpenseDocument | Expense,
    linkedVouchers: LinkedVoucherSummaryInput[] = [],
  ): ExpenseResponse {
    const document = expense as ExpenseDocument;
    const id = document._id ? document._id.toString() : '';
    const category = this.resolveCategorySummary(document);
    const invoiceDate = formatExpenseDate(document.date);
    const linkage = computeExpenseVoucherLinkage(
      document.amountPaise ?? 0,
      linkedVouchers,
    );

    return {
      id,
      expenseName: document.expenseName,
      categoryId: category.id,
      category,
      paidBy: document.paidBy,
      amount: paiseToInr(document.amountPaise),
      currency: document.currency ?? EXPENSE_CURRENCY,
      date: invoiceDate,
      invoiceDate,
      receivedDate: document.receivedDate
        ? formatExpenseDate(document.receivedDate)
        : null,
      receipt: document.receipt
        ? {
            url: document.receipt.url,
            publicId: document.receipt.publicId,
            fileName: document.receipt.fileName,
            mimeType: document.receipt.mimeType,
          }
        : null,
      notes: document.notes ?? '',
      voucherStatus: linkage.voucherStatus,
      voucheredAmount: paiseToInr(linkage.voucheredAmountPaise),
      remainingEligibleAmount: paiseToInr(linkage.remainingEligibleAmountPaise),
      vouchers: linkage.vouchers.map((voucher) => ({
        id: voucher.id,
        voucherNumber: voucher.voucherNumber,
        amount: paiseToInr(voucher.amountPaise),
        status: voucher.status,
      })),
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async create(createExpenseDto: CreateExpenseDto): Promise<ExpenseResponse> {
    await this.expenseCategoriesService.assertActiveCategory(
      createExpenseDto.categoryId,
    );

    const invoiceDate = this.resolveInvoiceDateInput(createExpenseDto);

    const created = await this.expenseModel.create({
      expenseName: createExpenseDto.expenseName,
      categoryId: new Types.ObjectId(createExpenseDto.categoryId),
      paidBy: createExpenseDto.paidBy,
      amountPaise: inrToPaise(createExpenseDto.amount),
      currency: EXPENSE_CURRENCY,
      date: parseExpenseDate(invoiceDate),
      receivedDate: createExpenseDto.receivedDate
        ? parseExpenseDate(createExpenseDto.receivedDate)
        : null,
      notes: createExpenseDto.notes?.trim() ?? '',
      receipt: null,
    });

    const populated = await this.populateCategory(created);
    return this.toResponse(populated, []);
  }

  async findAll(query: ExpenseQueryDto): Promise<ExpenseListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const baseFilter = buildExpenseFilterFromQuery(query);

    const [voucherCounts, linkedExpenseIds, voucheredSums] = await Promise.all([
      this.countVoucherStatuses(baseFilter),
      this.listLinkedExpenseIds(),
      this.sumVoucheredPaiseByExpense(),
    ]);

    const fullyCoveredIds = query.eligibleForVoucher
      ? await this.resolveFullyCoveredIds(voucheredSums)
      : [];

    const filter = this.applyVoucherFilters(
      baseFilter,
      query,
      linkedExpenseIds,
      fullyCoveredIds,
    );

    const [items, total, totalAgg] = await Promise.all([
      this.expenseModel
        .find(filter)
        .populate('categoryId')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
      this.expenseModel
        .aggregate<{ totalPaise: number }>([
          { $match: filter },
          { $group: { _id: null, totalPaise: { $sum: '$amountPaise' } } },
        ])
        .exec(),
    ]);

    const pageIds = items
      .map((item) => item._id)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const linkedByExpense = await this.loadLinkedVouchersByExpenseIds(pageIds);

    const totalPaise = totalAgg[0]?.totalPaise ?? 0;

    return {
      items: items.map((item) =>
        this.toResponse(item, linkedByExpense.get(item._id.toString()) ?? []),
      ),
      totalAmount: sumPaiseToInr(totalPaise),
      voucherCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ExpenseResponse> {
    const expense = await this.findDocumentById(id, true);
    const linked = await this.loadLinkedVouchersByExpenseIds([expense._id]);
    return this.toResponse(expense, linked.get(expense._id.toString()) ?? []);
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    const update: Partial<Expense> = {};

    if (updateExpenseDto.expenseName !== undefined) {
      update.expenseName = updateExpenseDto.expenseName;
    }
    if (updateExpenseDto.categoryId !== undefined) {
      await this.expenseCategoriesService.assertActiveCategory(
        updateExpenseDto.categoryId,
      );
      update.categoryId = new Types.ObjectId(updateExpenseDto.categoryId);
    }
    if (updateExpenseDto.paidBy !== undefined) {
      update.paidBy = updateExpenseDto.paidBy;
    }
    if (updateExpenseDto.amount !== undefined) {
      update.amountPaise = inrToPaise(updateExpenseDto.amount);
    }
    if (
      updateExpenseDto.invoiceDate !== undefined ||
      updateExpenseDto.date !== undefined
    ) {
      update.date = parseExpenseDate(
        this.resolveInvoiceDateInput(updateExpenseDto),
      );
    }
    if (updateExpenseDto.receivedDate !== undefined) {
      update.receivedDate =
        updateExpenseDto.receivedDate === null
          ? null
          : parseExpenseDate(updateExpenseDto.receivedDate);
    }
    if (updateExpenseDto.notes !== undefined) {
      update.notes = updateExpenseDto.notes;
    }

    const updated = await this.expenseModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('categoryId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Expense not found');
    }

    const linked = await this.loadLinkedVouchersByExpenseIds([updated._id]);
    return this.toResponse(updated, linked.get(updated._id.toString()) ?? []);
  }

  async remove(id: string): Promise<void> {
    const expense = await this.findDocumentById(id);

    if (expense.receipt?.publicId) {
      await this.safeDeleteReceipt(expense.receipt);
    }

    await this.expenseModel.findByIdAndDelete(id).exec();
  }

  async uploadReceipt(
    id: string,
    file: Express.Multer.File,
  ): Promise<ExpenseResponse> {
    const expense = await this.findDocumentById(id);
    const previousReceipt = expense.receipt;
    const publicId = `${EXPENSE_RECEIPT_FOLDER}/${id}`;
    const mimeType = file.mimetype?.toLowerCase() ?? '';
    const isPdf = mimeType === 'application/pdf';

    let uploaded: { url: string; publicId: string };
    try {
      if (isPdf) {
        uploaded = await this.cloudinaryService.uploadDocument(file, {
          publicId,
          folder: EXPENSE_RECEIPT_FOLDER,
        });
      } else {
        uploaded = await this.cloudinaryService.uploadImage(file, {
          publicId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to upload expense receipt for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload receipt');
    }

    const receipt = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: file.originalname,
      mimeType,
    };

    const updated = await this.expenseModel
      .findByIdAndUpdate(id, { receipt }, { new: true, runValidators: true })
      .populate('categoryId')
      .exec();

    if (!updated) {
      await this.safeDeleteReceipt(receipt);
      throw new NotFoundException('Expense not found');
    }

    if (
      previousReceipt?.publicId &&
      previousReceipt.publicId !== uploaded.publicId
    ) {
      await this.safeDeleteReceipt(previousReceipt);
    }

    const linked = await this.loadLinkedVouchersByExpenseIds([updated._id]);
    return this.toResponse(updated, linked.get(updated._id.toString()) ?? []);
  }

  async removeReceipt(id: string): Promise<ExpenseResponse> {
    const expense = await this.findDocumentById(id);

    if (expense.receipt?.publicId) {
      await this.safeDeleteReceipt(expense.receipt);
    }

    expense.receipt = null;
    await expense.save();

    const populated = await this.populateCategory(expense);
    const linked = await this.loadLinkedVouchersByExpenseIds([populated._id]);
    return this.toResponse(
      populated,
      linked.get(populated._id.toString()) ?? [],
    );
  }

  getCategoryDisplayName(
    expense: ExpenseDocument,
    populated?: ExpenseCategoryDocument | null,
  ): string {
    if (populated?.name) {
      return populated.name;
    }

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

  private applyVoucherFilters(
    baseFilter: Record<string, unknown>,
    query: ExpenseQueryDto,
    linkedExpenseIds: Types.ObjectId[],
    fullyCoveredIds: Types.ObjectId[],
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { ...baseFilter };
    const idConstraints: Record<string, unknown>[] = [];

    if (query.voucherStatus === 'VOUCHERED') {
      idConstraints.push({ _id: { $in: linkedExpenseIds } });
    } else if (query.voucherStatus === 'NOT_VOUCHERED') {
      idConstraints.push({ _id: { $nin: linkedExpenseIds } });
    }

    if (query.eligibleForVoucher) {
      idConstraints.push({ _id: { $nin: fullyCoveredIds } });
    }

    if (idConstraints.length === 0) {
      return filter;
    }

    if (idConstraints.length === 1) {
      return { ...filter, ...idConstraints[0] };
    }

    const andClauses = [
      ...(Array.isArray(filter.$and) ? (filter.$and as unknown[]) : []),
      ...idConstraints,
    ];
    const { $and: _ignored, ...rest } = filter;
    return { ...rest, $and: andClauses };
  }

  private async resolveFullyCoveredIds(
    voucheredSums: Map<string, number>,
  ): Promise<Types.ObjectId[]> {
    if (voucheredSums.size === 0) {
      return [];
    }

    const ids = [...voucheredSums.keys()].map((id) => new Types.ObjectId(id));
    const expenses = await this.expenseModel
      .find({ _id: { $in: ids } })
      .select({ _id: 1, amountPaise: 1 })
      .lean()
      .exec();

    const covered: Types.ObjectId[] = [];
    for (const expense of expenses) {
      const vouchered = voucheredSums.get(expense._id.toString()) ?? 0;
      if (vouchered >= (expense.amountPaise ?? 0)) {
        covered.push(expense._id);
      }
    }
    return covered;
  }

  private async countVoucherStatuses(
    baseFilter: Record<string, unknown>,
  ): Promise<ExpenseVoucherCounts> {
    const linkedExpenseIds = await this.listLinkedExpenseIds();
    const [all, vouchered] = await Promise.all([
      this.expenseModel.countDocuments(baseFilter).exec(),
      this.expenseModel
        .countDocuments({ ...baseFilter, _id: { $in: linkedExpenseIds } })
        .exec(),
    ]);

    return {
      all,
      vouchered,
      notVouchered: Math.max(0, all - vouchered),
    };
  }

  private async listLinkedExpenseIds(): Promise<Types.ObjectId[]> {
    const ids = await this.voucherModel.distinct('expenseId', {
      expenseId: { $ne: null },
      status: { $in: [...ACTIVE_VOUCHER_STATUSES] },
    });
    return ids.filter((id): id is Types.ObjectId => id instanceof Types.ObjectId);
  }

  private async sumVoucheredPaiseByExpense(): Promise<Map<string, number>> {
    const rows = await this.voucherModel
      .aggregate<VoucheredSumRow>([
        {
          $match: {
            expenseId: { $ne: null },
            status: { $in: [...ACTIVE_VOUCHER_STATUSES] },
          },
        },
        {
          $group: {
            _id: '$expenseId',
            voucheredPaise: { $sum: '$amountPaise' },
          },
        },
      ])
      .exec();

    const map = new Map<string, number>();
    for (const row of rows) {
      if (row._id) {
        map.set(row._id.toString(), row.voucheredPaise ?? 0);
      }
    }
    return map;
  }

  private async loadLinkedVouchersByExpenseIds(
    expenseIds: Types.ObjectId[],
  ): Promise<Map<string, LinkedVoucherSummaryInput[]>> {
    const map = new Map<string, LinkedVoucherSummaryInput[]>();
    if (expenseIds.length === 0) {
      return map;
    }

    const vouchers = await this.voucherModel
      .find({
        expenseId: { $in: expenseIds },
        status: { $in: [...ACTIVE_VOUCHER_STATUSES] },
      })
      .select({ _id: 1, expenseId: 1, voucherNumber: 1, amountPaise: 1, status: 1 })
      .lean()
      .exec();

    for (const voucher of vouchers) {
      const expenseId = voucher.expenseId?.toString();
      if (!expenseId) continue;
      const list = map.get(expenseId) ?? [];
      list.push({
        _id: voucher._id,
        voucherNumber: voucher.voucherNumber,
        amountPaise: voucher.amountPaise,
        status: voucher.status,
      });
      map.set(expenseId, list);
    }

    return map;
  }

  private resolveCategorySummary(expense: ExpenseDocument) {
    const categoryRef = expense.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | undefined;

    if (
      categoryRef &&
      typeof categoryRef === 'object' &&
      '_id' in categoryRef &&
      categoryRef._id
    ) {
      const document = categoryRef as ExpenseCategoryDocument;
      return {
        id: document._id.toString(),
        name: document.name,
      };
    }

    const id =
      categoryRef instanceof Types.ObjectId
        ? categoryRef.toString()
        : String(categoryRef ?? '');

    return {
      id,
      name: this.getCategoryDisplayName(expense),
    };
  }

  private resolveInvoiceDateInput(dto: {
    invoiceDate?: string;
    date?: string;
  }): string {
    const value = dto.invoiceDate ?? dto.date;
    if (!value) {
      throw new BadRequestException('Invoice date is required');
    }
    return value;
  }

  private async populateCategory(
    expense: ExpenseDocument,
  ): Promise<ExpenseDocument> {
    await expense.populate('categoryId');
    return expense;
  }

  private async findDocumentById(
    id: string,
    populate = false,
  ): Promise<ExpenseDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Expense not found');
    }

    const query = this.expenseModel.findById(id);
    if (populate) {
      query.populate('categoryId');
    }

    const expense = await query.exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private async safeDeleteReceipt(receipt: {
    publicId: string;
    mimeType: string;
  }): Promise<void> {
    try {
      const resourceType =
        receipt.mimeType === 'application/pdf' ? 'raw' : 'image';
      await this.cloudinaryService.deleteAsset(receipt.publicId, resourceType);
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary receipt ${receipt.publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
