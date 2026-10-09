import {
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
import { EXPENSE_CURRENCY, EXPENSE_RECEIPT_FOLDER } from './constants/expense-categories';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import {
  ExpenseListResponse,
  ExpenseResponse,
} from './interfaces/expense-response.interface';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { buildExpenseFilterFromQuery } from './utils/expense-filter.util';
import { formatExpenseDate, parseExpenseDate } from './utils/expense-date.util';
import { inrToPaise, paiseToInr, sumPaiseToInr } from './utils/money.util';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  toResponse(expense: ExpenseDocument | Expense): ExpenseResponse {
    const document = expense as ExpenseDocument;
    const id = document._id ? document._id.toString() : '';
    const category = this.resolveCategorySummary(document);

    return {
      id,
      expenseName: document.expenseName,
      categoryId: category.id,
      category,
      paidBy: document.paidBy,
      amount: paiseToInr(document.amountPaise),
      currency: document.currency ?? EXPENSE_CURRENCY,
      date: formatExpenseDate(document.date),
      receipt: document.receipt
        ? {
            url: document.receipt.url,
            publicId: document.receipt.publicId,
            fileName: document.receipt.fileName,
            mimeType: document.receipt.mimeType,
          }
        : null,
      notes: document.notes ?? '',
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async create(createExpenseDto: CreateExpenseDto): Promise<ExpenseResponse> {
    await this.expenseCategoriesService.assertActiveCategory(
      createExpenseDto.categoryId,
    );

    const created = await this.expenseModel.create({
      expenseName: createExpenseDto.expenseName,
      categoryId: new Types.ObjectId(createExpenseDto.categoryId),
      paidBy: createExpenseDto.paidBy,
      amountPaise: inrToPaise(createExpenseDto.amount),
      currency: EXPENSE_CURRENCY,
      date: parseExpenseDate(createExpenseDto.date),
      notes: createExpenseDto.notes?.trim() ?? '',
      receipt: null,
    });

    const populated = await this.populateCategory(created);
    return this.toResponse(populated);
  }

  async findAll(query: ExpenseQueryDto): Promise<ExpenseListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = buildExpenseFilterFromQuery(query);
    const skip = (page - 1) * limit;

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

    const totalPaise = totalAgg[0]?.totalPaise ?? 0;

    return {
      items: items.map((item) => this.toResponse(item)),
      totalAmount: sumPaiseToInr(totalPaise),
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
    return this.toResponse(expense);
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
    if (updateExpenseDto.date !== undefined) {
      update.date = parseExpenseDate(updateExpenseDto.date);
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

    return this.toResponse(updated);
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

    return this.toResponse(updated);
  }

  async removeReceipt(id: string): Promise<ExpenseResponse> {
    const expense = await this.findDocumentById(id);

    if (expense.receipt?.publicId) {
      await this.safeDeleteReceipt(expense.receipt);
    }

    expense.receipt = null;
    await expense.save();

    const populated = await this.populateCategory(expense);
    return this.toResponse(populated);
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
