import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import {
  ExpenseCategoryActiveResponse,
  ExpenseCategoryAdminResponse,
} from './interfaces/expense-category-response.interface';
import {
  ExpenseCategory,
  ExpenseCategoryDocument,
} from './schemas/expense-category.schema';

const CATEGORY_SORT = { order: 1, createdAt: 1, _id: 1 } as const;

const DEFAULT_CATEGORY_SEEDS = [
  {
    name: 'Server',
    description: 'Hosting and server expenses',
    order: 1,
  },
  {
    name: 'Domain',
    description: 'Domain registration and renewal',
    order: 2,
  },
  {
    name: 'Other services',
    description: 'Other software and service expenses',
    order: 3,
  },
] as const;

@Injectable()
export class ExpenseCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(ExpenseCategoriesService.name);

  constructor(
    @InjectModel(ExpenseCategory.name)
    private readonly categoryModel: Model<ExpenseCategoryDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultCategories();
    await this.migrateLegacyExpenseCategories();
  }

  normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  toAdminResponse(
    category: ExpenseCategoryDocument | ExpenseCategory,
  ): ExpenseCategoryAdminResponse {
    const document = category as ExpenseCategoryDocument;
    const id = document._id ? document._id.toString() : '';

    return {
      id,
      name: document.name,
      description: document.description ?? '',
      isActive: document.isActive,
      order: document.order,
      createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  toActiveResponse(
    category: ExpenseCategoryDocument | ExpenseCategory,
  ): ExpenseCategoryActiveResponse {
    const document = category as ExpenseCategoryDocument;
    return {
      id: document._id ? document._id.toString() : '',
      name: document.name,
      order: document.order,
    };
  }

  async findAllAdmin(): Promise<ExpenseCategoryAdminResponse[]> {
    const categories = await this.categoryModel.find().sort(CATEGORY_SORT).exec();
    return categories.map((category) => this.toAdminResponse(category));
  }

  async findAllActive(): Promise<ExpenseCategoryActiveResponse[]> {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort(CATEGORY_SORT)
      .exec();

    return categories.map((category) => this.toActiveResponse(category));
  }

  async getActiveCategoryNames(): Promise<string[]> {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort(CATEGORY_SORT)
      .exec();

    return categories.map((category) => category.name);
  }

  async findDocumentById(id: string): Promise<ExpenseCategoryDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Expense category not found');
    }

    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    return category;
  }

  async findByNameInsensitive(
    name: string,
  ): Promise<ExpenseCategoryDocument | null> {
    const normalized = this.normalizeName(name);
    if (!normalized) {
      return null;
    }

    return this.categoryModel.findOne({ nameNormalized: normalized }).exec();
  }

  async assertActiveCategory(
    categoryId: string,
  ): Promise<ExpenseCategoryDocument> {
    const category = await this.findDocumentById(categoryId);
    if (!category.isActive) {
      throw new BadRequestException('Expense category is inactive');
    }

    return category;
  }

  async getNextOrder(): Promise<number> {
    const latest = await this.categoryModel
      .findOne()
      .sort({ order: -1 })
      .select('order')
      .lean()
      .exec();

    return (latest?.order ?? 0) + 1;
  }

  async create(
    createDto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategoryAdminResponse> {
    const name = createDto.name.trim();
    if (!name) {
      throw new BadRequestException('Invalid category data');
    }

    const nameNormalized = this.normalizeName(name);
    const duplicate = await this.categoryModel
      .findOne({ nameNormalized })
      .exec();

    if (duplicate) {
      throw new ConflictException('Expense category already exists');
    }

    const order = createDto.order ?? (await this.getNextOrder());

    const created = await this.categoryModel.create({
      name,
      nameNormalized,
      description: createDto.description?.trim() ?? '',
      isActive: true,
      order,
    });

    return this.toAdminResponse(created);
  }

  async update(
    id: string,
    updateDto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryAdminResponse> {
    const category = await this.findDocumentById(id);
    const update: Partial<ExpenseCategory> = {};

    if (updateDto.name !== undefined) {
      const name = updateDto.name.trim();
      if (!name) {
        throw new BadRequestException('Invalid category data');
      }

      const nameNormalized = this.normalizeName(name);
      if (nameNormalized !== category.nameNormalized) {
        const duplicate = await this.categoryModel
          .findOne({ nameNormalized, _id: { $ne: category._id } })
          .exec();

        if (duplicate) {
          throw new ConflictException('Expense category already exists');
        }
      }

      update.name = name;
      update.nameNormalized = nameNormalized;
    }

    if (updateDto.description !== undefined) {
      update.description = updateDto.description.trim();
    }

    if (updateDto.order !== undefined) {
      update.order = updateDto.order;
    }

    if (updateDto.isActive !== undefined) {
      update.isActive = updateDto.isActive;
    }

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Expense category not found');
    }

    return this.toAdminResponse(updated);
  }

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ id: string; isActive: boolean }> {
    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { isActive }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Expense category not found');
    }

    return {
      id: updated._id.toString(),
      isActive: updated.isActive,
    };
  }

  async remove(id: string): Promise<void> {
    await this.findDocumentById(id);

    const inUse = await this.expenseModel
      .countDocuments({ categoryId: new Types.ObjectId(id) })
      .exec();
    if (inUse > 0) {
      throw new ConflictException(
        'Cannot delete category because it is used by existing expenses',
      );
    }

    await this.categoryModel.findByIdAndDelete(id).exec();
  }

  async mapCategoryNameToId(name: string | null): Promise<{
    categoryId: string | null;
    categoryName: string | null;
  }> {
    if (!name) {
      return { categoryId: null, categoryName: null };
    }

    const category = await this.findByNameInsensitive(name);
    if (!category || !category.isActive) {
      return { categoryId: null, categoryName: null };
    }

    return {
      categoryId: category._id.toString(),
      categoryName: category.name,
    };
  }

  private async seedDefaultCategories(): Promise<void> {
    for (const seed of DEFAULT_CATEGORY_SEEDS) {
      const nameNormalized = this.normalizeName(seed.name);
      const exists = await this.categoryModel
        .findOne({ nameNormalized })
        .exec();

      if (exists) {
        continue;
      }

      await this.categoryModel.create({
        name: seed.name,
        nameNormalized,
        description: seed.description,
        isActive: true,
        order: seed.order,
      });
    }
  }

  private async migrateLegacyExpenseCategories(): Promise<void> {
    const legacyExpenses = await this.expenseModel
      .find({
        $or: [{ categoryId: { $exists: false } }, { categoryId: null }],
      })
      .lean()
      .exec();

    if (legacyExpenses.length === 0) {
      return;
    }

    let migrated = 0;

    for (const expense of legacyExpenses) {
      const legacy = expense as ExpenseDocument & { category?: string };
      const legacyName = legacy.category?.trim();
      if (!legacyName) {
        continue;
      }

      const category = await this.findByNameInsensitive(legacyName);
      if (!category) {
        this.logger.warn(
          `Skipping expense ${String(expense._id)}: no category match for "${legacyName}"`,
        );
        continue;
      }

      await this.expenseModel.updateOne(
        { _id: expense._id },
        {
          $set: { categoryId: category._id },
          $unset: { category: '' },
        },
      );
      migrated += 1;
    }

    if (migrated > 0) {
      this.logger.log(`Migrated ${migrated} legacy expense(s) to categoryId`);
    }
  }
}
