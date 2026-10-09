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
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { UpdateExpenseCategoryStatusDto } from './dto/update-expense-category-status.dto';
import { ExpenseCategoriesService } from './expense-categories.service';

@Controller('expense-categories')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Get('admin')
  async findAllAdmin() {
    const data = await this.expenseCategoriesService.findAllAdmin();

    return {
      success: true,
      message: 'Expense categories fetched successfully',
      data,
    };
  }

  @Get()
  async findAllActive() {
    const data = await this.expenseCategoriesService.findAllActive();

    return {
      success: true,
      message: 'Active expense categories fetched successfully',
      data,
    };
  }

  @Post()
  async create(@Body() createDto: CreateExpenseCategoryDto) {
    const data = await this.expenseCategoriesService.create(createDto);

    return {
      success: true,
      message: 'Expense category created successfully',
      data,
    };
  }

  @Put(':id')
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
  async remove(@Param('id') id: string) {
    await this.expenseCategoriesService.remove(id);

    return {
      success: true,
      message: 'Expense category deleted successfully',
    };
  }
}
