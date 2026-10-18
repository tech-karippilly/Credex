import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  RequirePermissionsWhenPresent,
} from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { UpdateExpenseCategoryStatusDto } from './dto/update-expense-category-status.dto';
import { ExpenseCategoriesService } from './expense-categories.service';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get('admin')
  @RequirePermissions('expense_categories.read')
  async findAllAdmin() {
    const data = await this.expenseCategoriesService.findAllAdmin();

    return {
      success: true,
      message: 'Expense categories fetched successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('expense_categories.read')
  async findAllActive() {
    const data = await this.expenseCategoriesService.findAllActive();

    return {
      success: true,
      message: 'Active expense categories fetched successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('expense_categories.create')
  async create(@Body() createDto: CreateExpenseCategoryDto) {
    const data = await this.expenseCategoriesService.create(createDto);

    return {
      success: true,
      message: 'Expense category created successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('expense_categories.update')
  @RequirePermissionsWhenPresent('isActive', 'expense_categories.status.update')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExpenseCategoryDto,
  ) {
    const data = await this.expenseCategoriesService.update(id, updateDto);

    return {
      success: true,
      message: 'Expense category updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('expense_categories.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateExpenseCategoryStatusDto,
  ) {
    const data = await this.expenseCategoriesService.updateStatus(
      id,
      statusDto.isActive,
    );

    return {
      success: true,
      message: 'Expense category status updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('expense_categories.delete')
  async remove(@Param('id') id: string) {
    await this.expenseCategoriesService.remove(id);

    return {
      success: true,
      message: 'Expense category deleted successfully',
    };
  }
}
