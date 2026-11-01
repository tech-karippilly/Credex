import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { ExpenseCategoryDocument } from '../expense-categories/schemas/expense-category.schema';
import { EXPENSE_CURRENCY } from '../expenses/constants/expense-categories';
import { ExpensesService } from '../expenses/expenses.service';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { inrToPaise, paiseToInr, sumPaiseToInr } from '../expenses/utils/money.util';
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import {
  FixedExpenseListResponse,
  FixedExpenseResponse,
  GenerateFixedExpensesResponse,
} from './interfaces/fixed-expense-response.interface';
import {
  FixedExpense,
  FixedExpenseDocument,
} from './schemas/fixed-expense.schema';
import { expenseDateForFixedMonth } from './utils/fixed-expense-date.util';

const LIST_SORT = { isActive: -1, expenseName: 1, _id: 1 } as const;

@Injectable()
export class FixedExpensesService {
  constructor(
    @InjectModel(FixedExpense.name)
    private readonly fixedExpenseModel: Model<FixedExpenseDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
    private readonly expensesService: ExpensesService,
  ) {}

  toResponse(
    fixed: FixedExpenseDocument | FixedExpense,
  ): FixedExpenseResponse {
    const document = fixed as FixedExpenseDocument;
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
      dayOfMonth: document.dayOfMonth,
      notes: document.notes ?? '',
      isActive: document.isActive,
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async findAll(): Promise<FixedExpenseListResponse> {
    const items = await this.fixedExpenseModel
      .find()
      .populate('categoryId')
      .sort(LIST_SORT)
      .exec();

    const activePaise = items
      .filter((item) => item.isActive)
      .reduce((sum, item) => sum + item.amountPaise, 0);

    return {
      items: items.map((item) => this.toResponse(item)),
      totalMonthlyAmount: sumPaiseToInr(activePaise),
    };
  }

  async findOne(id: string): Promise<FixedExpenseResponse> {
    const fixed = await this.findDocumentById(id, true);
    return this.toResponse(fixed);
  }

  async create(dto: CreateFixedExpenseDto): Promise<FixedExpenseResponse> {
    await this.expenseCategoriesService.assertActiveCategory(dto.categoryId);

    const created = await this.fixedExpenseModel.create({
      expenseName: dto.expenseName,
      categoryId: new Types.ObjectId(dto.categoryId),
      paidBy: dto.paidBy,
      amountPaise: inrToPaise(dto.amount),
      currency: EXPENSE_CURRENCY,
      dayOfMonth: dto.dayOfMonth,
      notes: dto.notes?.trim() ?? '',
      isActive: true,
    });

    const populated = await this.populateCategory(created);
    return this.toResponse(populated);
  }

  async update(
    id: string,
    dto: UpdateFixedExpenseDto,
  ): Promise<FixedExpenseResponse> {
    const update: Partial<FixedExpense> = {};

    if (dto.expenseName !== undefined) {
      update.expenseName = dto.expenseName;
    }
    if (dto.categoryId !== undefined) {
      await this.expenseCategoriesService.assertActiveCategory(dto.categoryId);
      update.categoryId = new Types.ObjectId(dto.categoryId);
    }
    if (dto.paidBy !== undefined) {
      update.paidBy = dto.paidBy;
    }
    if (dto.amount !== undefined) {
      update.amountPaise = inrToPaise(dto.amount);
    }
    if (dto.dayOfMonth !== undefined) {
      update.dayOfMonth = dto.dayOfMonth;
    }
    if (dto.notes !== undefined) {
      update.notes = dto.notes;
    }
    if (dto.isActive !== undefined) {
      update.isActive = dto.isActive;
    }

    const updated = await this.fixedExpenseModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate('categoryId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Fixed expense not found');
    }

    return this.toResponse(updated);
  }

  async updateStatus(id: string, isActive: boolean): Promise<FixedExpenseResponse> {
    return this.update(id, { isActive });
  }

  async remove(id: string): Promise<void> {
    await this.findDocumentById(id);

    const linked = await this.expenseModel
      .countDocuments({ fixedExpenseId: new Types.ObjectId(id) })
      .exec();

    if (linked > 0) {
      throw new ConflictException(
        'This fixed expense cannot be deleted because expenses were generated from it. You can disable it instead.',
      );
    }

    await this.fixedExpenseModel.findByIdAndDelete(id).exec();
  }

  async generateForMonth(month: string): Promise<GenerateFixedExpensesResponse> {
    const templates = await this.fixedExpenseModel
      .find({ isActive: true })
      .sort(LIST_SORT)
      .exec();

    const created: GenerateFixedExpensesResponse['created'] = [];
    const skipped: GenerateFixedExpensesResponse['skipped'] = [];

    for (const template of templates) {
      const templateId = template._id.toString();
      const existing = await this.expenseModel
        .findOne({
          fixedExpenseId: template._id,
          generatedForMonth: month,
        })
        .exec();

      if (existing) {
        skipped.push({
          fixedExpenseId: templateId,
          expenseName: template.expenseName,
          reason: 'Expense already exists for this month',
        });
        continue;
      }

      try {
        await this.expenseCategoriesService.assertActiveCategory(
          template.categoryId.toString(),
        );
        const expense = await this.expensesService.createFromFixedExpense({
          fixedExpenseId: template._id,
          expenseName: template.expenseName,
          categoryId: template.categoryId,
          paidBy: template.paidBy,
          amountPaise: template.amountPaise,
          date: expenseDateForFixedMonth(month, template.dayOfMonth),
          notes: template.notes?.trim() ?? '',
          generatedForMonth: month,
        });
        created.push(expense);
      } catch (error) {
        skipped.push({
          fixedExpenseId: templateId,
          expenseName: template.expenseName,
          reason:
            error instanceof Error ? error.message : 'Could not create expense',
        });
      }
    }

    return { month, created, skipped };
  }

  private async findDocumentById(
    id: string,
    populateCategory = false,
  ): Promise<FixedExpenseDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Fixed expense not found');
    }

    const query = this.fixedExpenseModel.findById(id);
    if (populateCategory) {
      query.populate('categoryId');
    }

    const fixed = await query.exec();
    if (!fixed) {
      throw new NotFoundException('Fixed expense not found');
    }

    return fixed;
  }

  private async populateCategory(
    fixed: FixedExpenseDocument,
  ): Promise<FixedExpenseDocument> {
    await fixed.populate('categoryId');
    return fixed;
  }

  private resolveCategorySummary(
    fixed: FixedExpenseDocument,
  ): FixedExpenseResponse['category'] {
    const populated = fixed.categoryId as unknown as ExpenseCategoryDocument;
    if (populated && typeof populated === 'object' && populated._id) {
      return {
        id: populated._id.toString(),
        name: populated.name,
      };
    }

    const raw = fixed.categoryId as Types.ObjectId;
    return {
      id: raw?.toString?.() ?? '',
      name: 'Unknown',
    };
  }
}
