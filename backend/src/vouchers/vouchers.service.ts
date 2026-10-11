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
  PaymentAllocation,
  PaymentAllocationDocument,
} from '../payments/schemas/payment-allocation.schema';
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
  VoucherListResponse,
  VoucherResponse,
} from './interfaces/voucher-response.interface';
import { Voucher, VoucherDocument } from './schemas/voucher.schema';
import { VoucherNumberService } from './services/voucher-number.service';
import { buildVoucherFilterFromQuery } from './utils/voucher-filter.util';

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
    private readonly cloudinaryService: CloudinaryService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
    private readonly voucherNumberService: VoucherNumberService,
  ) {}

  toResponse(voucher: VoucherDocument | Voucher): VoucherResponse {
    const document = voucher as VoucherDocument;
    const id = document._id ? document._id.toString() : '';

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
        Math.max(0, document.amountPaise - (document.reservedPaise ?? 0)),
      ),
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

    if (createDto.expenseId) {
      await this.assertExpenseExists(createDto.expenseId);
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
      amountPaise: inrToPaise(createDto.amount),
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
      status: createDto.status ?? DEFAULT_VOUCHER_STATUS,
    };

    try {
      const created = await this.voucherModel.create(payload);
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

    const [items, total] = await Promise.all([
      this.voucherModel
        .find(filter)
        .populate(POPULATE_PATHS)
        .sort({ voucherDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.voucherModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<VoucherResponse> {
    const voucher = await this.findDocumentById(id, true);
    return this.toResponse(voucher);
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
        await this.assertExpenseExists(updateDto.expenseId);
        update.expenseId = new Types.ObjectId(updateDto.expenseId);
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
  ): { id: string; expenseName: string; amount: number } | null {
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
      };
    }

    const id = ref instanceof Types.ObjectId ? ref.toString() : String(ref);
    return { id, expenseName: 'Unknown expense', amount: 0 };
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
