import {
  BadRequestException,
  ConflictException,
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
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { formatExpenseDate, parseExpenseDate } from '../expenses/utils/expense-date.util';
import { inrToPaise, paiseToInr } from '../expenses/utils/money.util';
import {
  ACTIVE_VOUCHER_STATUSES,
  computeExpenseVoucherLinkage,
  isFullyVouchered,
} from '../expenses/utils/expense-voucher.util';
import {
  PaymentAllocation,
  PaymentAllocationDocument,
} from '../payments/schemas/payment-allocation.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { settlementStatus } from '../payments/utils/payment-rules';
import {
  DEFAULT_VOUCHER_STATUS,
  VOUCHER_CURRENCY,
  VOUCHER_DOCUMENT_FOLDER,
} from './constants/voucher.constants';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import {
  VoucherDetailResponse,
  VoucherExpenseDetail,
  VoucherListResponse,
  VoucherPaymentHistoryItem,
  VoucherResponse,
  VoucherSettlementCounts,
} from './interfaces/voucher-response.interface';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { VoucherNumberService } from './services/voucher-number.service';
import {
  buildVoucherFilterFromQuery,
  settlementStatusExpression,
} from './utils/voucher-filter.util';

const POPULATE_PATHS: string[] = ['categoryId', 'expenseId'];

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    @InjectModel(Voucher.name)
    private readonly voucherModel: Model<VoucherDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(PaymentAllocation.name)
    private readonly paymentAllocationModel: Model<PaymentAllocationDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
    private readonly voucherNumberService: VoucherNumberService,
  ) {}

  toResponse(voucher: VoucherDocument | Voucher): VoucherResponse {
    const document = voucher as VoucherDocument;
    const id = document._id ? document._id.toString() : '';
    const reservedPaise = document.reservedPaise ?? 0;

    return {
      id,
      voucherNumber: document.voucherNumber,
      voucherDate: formatExpenseDate(document.voucherDate),
      voucherType: document.voucherType,
      title: document.title,
      description: document.description ?? '',
      paidBy: document.paidBy,
      payee: document.payee,
      amount: paiseToInr(document.amountPaise),
      amountPaid: paiseToInr(document.settledPaise ?? 0),
      outstandingAmount: paiseToInr(
        Math.max(0, document.amountPaise - (document.settledPaise ?? 0)),
      ),
      availableToAllocate: paiseToInr(
        Math.max(0, document.amountPaise - reservedPaise),
      ),
      amountReserved: paiseToInr(reservedPaise),
      settlementStatus: settlementStatus(
        document.amountPaise,
        document.settledPaise ?? 0,
      ),
      currency: document.currency ?? VOUCHER_CURRENCY,
      paymentMode: document.paymentMode,
      categoryId: this.resolveCategoryId(document),
      category: this.resolveCategorySummary(document),
      expenseId: this.resolveExpenseId(document),
      expense: this.resolveExpenseSummary(document),
      referenceNumber: document.referenceNumber ?? '',
      notes: document.notes ?? '',
      document: document.document
        ? {
            url: document.document.url,
            publicId: document.document.publicId,
            fileName: document.document.fileName,
            mimeType: document.document.mimeType,
          }
        : null,
      status: document.status,
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async create(createDto: CreateVoucherDto): Promise<VoucherResponse> {
    if (createDto.categoryId) {
      await this.expenseCategoriesService.assertActiveCategory(
        createDto.categoryId,
      );
    }

    const amountPaise = inrToPaise(createDto.amount);
    const status = createDto.status ?? DEFAULT_VOUCHER_STATUS;

    if (createDto.expenseId && status !== 'CANCELLED') {
      await this.assertExpenseAcceptsVoucherAmount(
        createDto.expenseId,
        amountPaise,
      );
    }

    const voucherDate = parseExpenseDate(createDto.voucherDate);
    const voucherNumber =
      await this.voucherNumberService.generateVoucherNumber(voucherDate);

    const payload = {
      voucherNumber,
      voucherDate,
      voucherType: createDto.voucherType,
      title: createDto.title,
      description: createDto.description?.trim() ?? '',
      paidBy: createDto.paidBy,
      payee: createDto.payee,
      amountPaise,
      currency: VOUCHER_CURRENCY,
      paymentMode: createDto.paymentMode,
      categoryId: createDto.categoryId
        ? new Types.ObjectId(createDto.categoryId)
        : null,
      expenseId: createDto.expenseId
        ? new Types.ObjectId(createDto.expenseId)
        : null,
      referenceNumber: createDto.referenceNumber?.trim() ?? '',
      notes: createDto.notes?.trim() ?? '',
      document: null,
      status,
    };

    try {
      const created = await this.voucherModel.create(payload);
      if (createDto.expenseId && status !== 'CANCELLED') {
        await this.assertExpenseLinkageStillValid(
          createDto.expenseId,
          created._id.toString(),
        );
      }
      const populated = await this.populateRelations(created);
      return this.toResponse(populated);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Duplicate voucher number');
      }
      throw error;
    }
  }

  async findAll(query: VoucherQueryDto): Promise<VoucherListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = buildVoucherFilterFromQuery(query);
    const skip = (page - 1) * limit;
    const baseFilterForCounts = buildVoucherFilterFromQuery({
      ...query,
      settlementStatus: undefined,
    });

    const [items, total, settlementCounts] = await Promise.all([
      this.voucherModel
        .find(filter)
        .populate(POPULATE_PATHS)
        .sort({ voucherDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(filter).exec(),
      this.computeSettlementCounts(baseFilterForCounts),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      settlementCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<VoucherDetailResponse> {
    const voucher = await this.findDocumentById(id, true);
    const base = this.toResponse(voucher);
    const [expense, payments] = await Promise.all([
      this.resolveExpenseDetail(voucher),
      this.loadPaymentHistory(voucher._id),
    ]);

    return {
      ...base,
      expense,
      payments,
      deliveryAttempts: (voucher.deliveryAttempts ?? []).map((attempt) => ({
        channel: attempt.channel,
        recipient: attempt.recipient,
        status: attempt.status,
        providerMessageId: attempt.providerMessageId,
        errorSummary: attempt.errorSummary,
        attemptedAt:
          attempt.attemptedAt?.toISOString?.() ??
          new Date(attempt.attemptedAt).toISOString(),
      })),
    };
  }

  async update(id: string, updateDto: UpdateVoucherDto): Promise<VoucherResponse> {
    const existing = await this.findDocumentById(id);
    this.assertSettlementCompatible(existing, updateDto);
    const update: Record<string, unknown> = {};

    if (updateDto.voucherDate !== undefined) {
      update.voucherDate = parseExpenseDate(updateDto.voucherDate);
    }
    if (updateDto.voucherType !== undefined) {
      update.voucherType = updateDto.voucherType;
    }
    if (updateDto.title !== undefined) {
      update.title = updateDto.title;
    }
    if (updateDto.description !== undefined) {
      update.description = updateDto.description;
    }
    if (updateDto.paidBy !== undefined) {
      update.paidBy = updateDto.paidBy;
    }
    if (updateDto.payee !== undefined) {
      update.payee = updateDto.payee;
    }
    if (updateDto.amount !== undefined) {
      update.amountPaise = inrToPaise(updateDto.amount);
    }
    if (updateDto.paymentMode !== undefined) {
      update.paymentMode = updateDto.paymentMode;
    }
    if (updateDto.categoryId !== undefined) {
      if (updateDto.categoryId === null) {
        update.categoryId = null;
      } else {
        await this.expenseCategoriesService.assertActiveCategory(
          updateDto.categoryId,
        );
        update.categoryId = new Types.ObjectId(updateDto.categoryId);
      }
    }
    if (updateDto.expenseId !== undefined) {
      if (updateDto.expenseId === null) {
        update.expenseId = null;
      } else {
        const nextAmountPaise =
          updateDto.amount !== undefined
            ? inrToPaise(updateDto.amount)
            : existing.amountPaise;
        const nextStatus = updateDto.status ?? existing.status;
        if (nextStatus !== 'CANCELLED') {
          await this.assertExpenseAcceptsVoucherAmount(
            updateDto.expenseId,
            nextAmountPaise,
            existing._id.toString(),
          );
        }
        update.expenseId = new Types.ObjectId(updateDto.expenseId);
      }
    } else if (
      this.resolveExpenseId(existing) &&
      (updateDto.amount !== undefined || updateDto.status !== undefined)
    ) {
      const linkedExpenseId = this.resolveExpenseId(existing);
      const nextAmountPaise =
        updateDto.amount !== undefined
          ? inrToPaise(updateDto.amount)
          : existing.amountPaise;
      const nextStatus = updateDto.status ?? existing.status;
      if (linkedExpenseId && nextStatus !== 'CANCELLED') {
        await this.assertExpenseAcceptsVoucherAmount(
          linkedExpenseId,
          nextAmountPaise,
          existing._id.toString(),
        );
      }
    }
    if (updateDto.referenceNumber !== undefined) {
      update.referenceNumber = updateDto.referenceNumber;
    }
    if (updateDto.notes !== undefined) {
      update.notes = updateDto.notes;
    }
    if (updateDto.status !== undefined) {
      update.status = updateDto.status;
    }

    const updated = await this.voucherModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate(POPULATE_PATHS)
      .exec();

    if (!updated) {
      throw new NotFoundException('Voucher not found');
    }

    return this.toResponse(updated);
  }

  async updateStatus(id: string, status: string): Promise<VoucherResponse> {
    const existing = await this.findDocumentById(id);
    this.assertSettlementCompatible(existing, { status });

    const updated = await this.voucherModel
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .populate(POPULATE_PATHS)
      .exec();

    if (!updated) {
      throw new NotFoundException('Voucher not found');
    }

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const voucher = await this.findDocumentById(id);
    const allocationCount = await this.paymentAllocationModel.countDocuments({
      voucherId: voucher._id,
    });

    if (
      (voucher.reservedPaise ?? 0) > 0 ||
      (voucher.settledPaise ?? 0) > 0 ||
      allocationCount > 0
    ) {
      throw new ConflictException(
        'This voucher has payment allocations and cannot be deleted',
      );
    }

    if (voucher.document?.publicId) {
      await this.safeDeleteDocument(voucher.document);
    }

    await this.voucherModel.findByIdAndDelete(id).exec();
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
  ): Promise<VoucherResponse> {
    const voucher = await this.findDocumentById(id);
    const previousDocument = voucher.document;
    const publicId = `${VOUCHER_DOCUMENT_FOLDER}/${id}`;
    const mimeType = file.mimetype?.toLowerCase() ?? '';
    const isPdf = mimeType === 'application/pdf';

    let uploaded: { url: string; publicId: string };
    try {
      if (isPdf) {
        uploaded = await this.cloudinaryService.uploadDocument(file, {
          publicId,
          folder: VOUCHER_DOCUMENT_FOLDER,
        });
      } else {
        uploaded = await this.cloudinaryService.uploadImage(file, {
          publicId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to upload voucher document for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload document');
    }

    const document = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: file.originalname,
      mimeType,
    };

    const updated = await this.voucherModel
      .findByIdAndUpdate(id, { document }, { new: true, runValidators: true })
      .populate(POPULATE_PATHS)
      .exec();

    if (!updated) {
      await this.safeDeleteDocument(document);
      throw new NotFoundException('Voucher not found');
    }

    if (
      previousDocument?.publicId &&
      previousDocument.publicId !== uploaded.publicId
    ) {
      await this.safeDeleteDocument(previousDocument);
    }

    return this.toResponse(updated);
  }

  async removeDocument(id: string): Promise<VoucherResponse> {
    const voucher = await this.findDocumentById(id, true);

    if (voucher.document?.publicId) {
      await this.safeDeleteDocument(voucher.document);
    }

    voucher.document = null;
    await voucher.save();

    const populated = await this.populateRelations(voucher);
    return this.toResponse(populated);
  }

  private assertSettlementCompatible(
    existing: VoucherDocument,
    updateDto: { amount?: number; status?: string; voucherType?: string },
  ): void {
    const reserved = existing.reservedPaise ?? 0;
    if (reserved <= 0) return;

    if (
      updateDto.amount !== undefined &&
      inrToPaise(updateDto.amount) < reserved
    ) {
      throw new BadRequestException(
        'Voucher amount cannot be reduced below the amount reserved by payment allocations',
      );
    }

    if (updateDto.status === 'CANCELLED' || updateDto.status === 'DRAFT') {
      throw new BadRequestException(
        'Release the linked payment allocations before marking this voucher draft or cancelled',
      );
    }

    if (updateDto.voucherType === 'RECEIPT') {
      throw new BadRequestException(
        'A voucher with payment allocations cannot be changed to a receipt',
      );
    }
  }

  private async assertExpenseExists(expenseId: string): Promise<ExpenseDocument> {
    if (!isValidObjectId(expenseId)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel.findById(expenseId).exec();
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  private async assertExpenseAcceptsVoucherAmount(
    expenseId: string,
    amountPaise: number,
    excludeVoucherId?: string,
  ): Promise<void> {
    const expense = await this.assertExpenseExists(expenseId);
    const linked = await this.loadActiveLinkedVouchers(
      expense._id,
      excludeVoucherId,
    );
    const linkage = computeExpenseVoucherLinkage(
      expense.amountPaise ?? 0,
      linked,
    );

    if (isFullyVouchered(expense.amountPaise ?? 0, linked)) {
      throw new ConflictException(
        'This expense is already fully vouchered and cannot accept another voucher',
      );
    }

    if (amountPaise > linkage.remainingEligibleAmountPaise) {
      throw new BadRequestException(
        `Voucher amount exceeds the remaining eligible amount for this expense (${paiseToInr(linkage.remainingEligibleAmountPaise)} INR)`,
      );
    }
  }

  /**
   * Post-create guard against concurrent voucher creation overshooting the
   * expense amount. Rolls back the new voucher when the race is detected.
   */
  private async assertExpenseLinkageStillValid(
    expenseId: string,
    createdVoucherId: string,
  ): Promise<void> {
    const expense = await this.assertExpenseExists(expenseId);
    const linked = await this.loadActiveLinkedVouchers(expense._id);
    const voucheredPaise = linked.reduce(
      (sum, row) => sum + (row.amountPaise ?? 0),
      0,
    );

    if (voucheredPaise <= (expense.amountPaise ?? 0)) {
      return;
    }

    await this.voucherModel.findByIdAndDelete(createdVoucherId).exec();
    throw new ConflictException(
      'This expense was vouchered concurrently and can no longer accept this voucher',
    );
  }

  private async loadActiveLinkedVouchers(
    expenseObjectId: Types.ObjectId,
    excludeVoucherId?: string,
  ) {
    const filter: Record<string, unknown> = {
      expenseId: expenseObjectId,
      status: { $in: [...ACTIVE_VOUCHER_STATUSES] },
    };
    if (excludeVoucherId && isValidObjectId(excludeVoucherId)) {
      filter._id = { $ne: new Types.ObjectId(excludeVoucherId) };
    }

    return this.voucherModel
      .find(filter)
      .select({ _id: 1, voucherNumber: 1, amountPaise: 1, status: 1 })
      .lean()
      .exec();
  }

  private async computeSettlementCounts(
    baseFilter: Record<string, unknown>,
  ): Promise<VoucherSettlementCounts> {
    const [unpaid, partiallyPaid, paid, outstandingAgg] = await Promise.all([
      this.voucherModel
        .countDocuments({
          ...baseFilter,
          $expr: settlementStatusExpression('UNPAID'),
        })
        .exec(),
      this.voucherModel
        .countDocuments({
          ...baseFilter,
          $expr: settlementStatusExpression('PARTIALLY_PAID'),
        })
        .exec(),
      this.voucherModel
        .countDocuments({
          ...baseFilter,
          $expr: settlementStatusExpression('PAID'),
        })
        .exec(),
      this.voucherModel
        .aggregate<{ totalOutstandingPaise: number }>([
          { $match: baseFilter },
          {
            $group: {
              _id: null,
              totalOutstandingPaise: {
                $sum: {
                  $max: [
                    0,
                    {
                      $subtract: [
                        '$amountPaise',
                        { $ifNull: ['$settledPaise', 0] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        ])
        .exec(),
    ]);

    return {
      unpaid,
      partiallyPaid,
      paid,
      totalOutstandingAmount: paiseToInr(
        outstandingAgg[0]?.totalOutstandingPaise ?? 0,
      ),
    };
  }

  private async findDocumentById(
    id: string,
    populate = false,
  ): Promise<VoucherDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Voucher not found');
    }

    const query = this.voucherModel.findById(id);
    if (populate) {
      query.populate(POPULATE_PATHS);
    }

    const voucher = await query.exec();
    if (!voucher) {
      throw new NotFoundException('Voucher not found');
    }

    return voucher;
  }

  private async populateRelations(
    voucher: VoucherDocument,
  ): Promise<VoucherDocument> {
    await voucher.populate(POPULATE_PATHS);
    return voucher;
  }

  private resolveCategoryId(voucher: VoucherDocument): string | null {
    const ref = voucher.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | null
      | undefined;
    if (!ref) {
      return null;
    }
    if (ref instanceof Types.ObjectId) {
      return ref.toString();
    }
    if (typeof ref === 'object' && ref._id) {
      return ref._id.toString();
    }
    return String(ref);
  }

  private resolveCategorySummary(
    voucher: VoucherDocument,
  ): { id: string; name: string } | null {
    const ref = voucher.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | null
      | undefined;

    if (!ref) {
      return null;
    }

    if (
      typeof ref === 'object' &&
      '_id' in ref &&
      ref._id &&
      'name' in ref &&
      typeof ref.name === 'string'
    ) {
      return {
        id: ref._id.toString(),
        name: ref.name,
      };
    }

    const id = ref instanceof Types.ObjectId ? ref.toString() : String(ref);
    return { id, name: 'Unknown category' };
  }

  private resolveExpenseId(voucher: VoucherDocument): string | null {
    const ref = voucher.expenseId as
      | ExpenseDocument
      | Types.ObjectId
      | null
      | undefined;
    if (!ref) {
      return null;
    }
    if (ref instanceof Types.ObjectId) {
      return ref.toString();
    }
    if (typeof ref === 'object' && ref._id) {
      return ref._id.toString();
    }
    return String(ref);
  }

  private resolveExpenseSummary(
    voucher: VoucherDocument,
  ): {
    id: string;
    expenseName: string;
    amount: number;
    invoiceDate: string | null;
  } | null {
    const ref = voucher.expenseId as ExpenseDocument | Types.ObjectId | null;

    if (!ref) {
      return null;
    }

    if (
      typeof ref === 'object' &&
      '_id' in ref &&
      ref._id &&
      'expenseName' in ref
    ) {
      const expense = ref as ExpenseDocument;
      return {
        id: expense._id.toString(),
        expenseName: expense.expenseName,
        amount: paiseToInr(expense.amountPaise),
        invoiceDate: expense.date ? formatExpenseDate(expense.date) : null,
      };
    }

    const id = ref instanceof Types.ObjectId ? ref.toString() : String(ref);
    return { id, expenseName: 'Unknown expense', amount: 0, invoiceDate: null };
  }

  private async resolveExpenseDetail(
    voucher: VoucherDocument,
  ): Promise<VoucherExpenseDetail | null> {
    const expenseId = this.resolveExpenseId(voucher);
    if (!expenseId) {
      return null;
    }

    if (!isValidObjectId(expenseId)) {
      return {
        id: expenseId,
        expenseName: 'Unknown expense',
        amount: 0,
        invoiceDate: null,
        paidBy: '',
        category: null,
        notes: '',
        receivedDate: null,
        receipt: null,
      };
    }

    const expense = await this.expenseModel
      .findById(expenseId)
      .populate('categoryId')
      .exec();

    if (!expense) {
      return {
        id: expenseId,
        expenseName: 'Expense no longer available',
        amount: 0,
        invoiceDate: null,
        paidBy: '',
        category: null,
        notes: '',
        receivedDate: null,
        receipt: null,
      };
    }

    const categoryRef = expense.categoryId as
      | ExpenseCategoryDocument
      | Types.ObjectId
      | undefined;
    let category: { id: string; name: string } | null = null;
    if (
      categoryRef &&
      typeof categoryRef === 'object' &&
      '_id' in categoryRef &&
      categoryRef._id &&
      'name' in categoryRef
    ) {
      category = {
        id: categoryRef._id.toString(),
        name: categoryRef.name,
      };
    } else if (categoryRef) {
      category = {
        id:
          categoryRef instanceof Types.ObjectId
            ? categoryRef.toString()
            : String(categoryRef),
        name: 'Unknown category',
      };
    }

    return {
      id: expense._id.toString(),
      expenseName: expense.expenseName,
      amount: paiseToInr(expense.amountPaise),
      invoiceDate: expense.date ? formatExpenseDate(expense.date) : null,
      paidBy: expense.paidBy ?? '',
      category,
      notes: expense.notes ?? '',
      receivedDate: expense.receivedDate
        ? formatExpenseDate(expense.receivedDate)
        : null,
      receipt: expense.receipt
        ? {
            url: expense.receipt.url,
            publicId: expense.receipt.publicId,
            fileName: expense.receipt.fileName,
            mimeType: expense.receipt.mimeType,
          }
        : null,
    };
  }

  private async loadPaymentHistory(
    voucherId: Types.ObjectId,
  ): Promise<VoucherPaymentHistoryItem[]> {
    const allocations = await this.paymentAllocationModel
      .find({ voucherId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (allocations.length === 0) {
      return [];
    }

    const paymentIds = allocations.map((row) => row.paymentId);
    const payments = await this.paymentModel
      .find({ _id: { $in: paymentIds } })
      .lean()
      .exec();
    const paymentById = new Map(
      payments.map((payment) => [payment._id.toString(), payment]),
    );

    const items: VoucherPaymentHistoryItem[] = [];
    for (const allocation of allocations) {
      const payment = paymentById.get(allocation.paymentId.toString());
      if (!payment) continue;
      items.push({
        id: payment._id.toString(),
        paymentNumber: payment.paymentNumber,
        paymentDate: formatExpenseDate(payment.paymentDate),
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        allocatedAmount: paiseToInr(allocation.amountPaise),
        paymentAmount: paiseToInr(payment.amountPaise),
        referenceNumber: payment.referenceNumber ?? '',
        chequeNumber: payment.chequeNumber ?? '',
        chequeDate: payment.chequeDate
          ? formatExpenseDate(payment.chequeDate)
          : null,
        transferMethod: payment.transferMethod ?? '',
        sourceAccount: payment.sourceAccount ?? '',
      });
    }

    items.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
    return items;
  }

  private async safeDeleteDocument(document: {
    publicId: string;
    mimeType: string;
  }): Promise<void> {
    try {
      const resourceType =
        document.mimeType === 'application/pdf' ? 'raw' : 'image';
      await this.cloudinaryService.deleteAsset(document.publicId, resourceType);
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary voucher document ${document.publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
