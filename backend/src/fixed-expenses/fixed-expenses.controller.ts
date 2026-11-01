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
import { CreateFixedExpenseDto } from './dto/create-fixed-expense.dto';
import { GenerateFixedExpensesDto } from './dto/generate-fixed-expenses.dto';
import { UpdateFixedExpenseDto } from './dto/update-fixed-expense.dto';
import { UpdateFixedExpenseStatusDto } from './dto/update-fixed-expense-status.dto';
import { FixedExpensesService } from './fixed-expenses.service';

@Controller('fixed-expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FixedExpensesController {
  constructor(private readonly fixedExpensesService: FixedExpensesService) {}

  @Get()
  @RequirePermissions('fixed_expenses.read')
  async findAll() {
    const data = await this.fixedExpensesService.findAll();

    return {
      success: true,
      message: 'Fixed expenses fetched successfully',
      data,
    };
  }

  @Post('generate')
  @RequirePermissions('fixed_expenses.generate', 'expenses.create')
  async generate(@Body() dto: GenerateFixedExpensesDto) {
    const data = await this.fixedExpensesService.generateForMonth(dto.month);

    return {
      success: true,
      message: 'Fixed expenses generated for month',
      data,
    };
  }

  @Post()
  @RequirePermissions('fixed_expenses.create')
  async create(@Body() dto: CreateFixedExpenseDto) {
    const data = await this.fixedExpensesService.create(dto);

    return {
      success: true,
      message: 'Fixed expense created successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('fixed_expenses.read')
  async findOne(@Param('id') id: string) {
    const data = await this.fixedExpensesService.findOne(id);

    return {
      success: true,
      message: 'Fixed expense fetched successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('fixed_expenses.update')
  @RequirePermissionsWhenPresent('isActive', 'fixed_expenses.status.update')
  async update(@Param('id') id: string, @Body() dto: UpdateFixedExpenseDto) {
    const data = await this.fixedExpensesService.update(id, dto);

    return {
      success: true,
      message: 'Fixed expense updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('fixed_expenses.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateFixedExpenseStatusDto,
  ) {
    const data = await this.fixedExpensesService.updateStatus(id, body.isActive);

    return {
      success: true,
      message: 'Fixed expense status updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('fixed_expenses.delete')
  async remove(@Param('id') id: string) {
    await this.fixedExpensesService.remove(id);

    return {
      success: true,
      message: 'Fixed expense deleted successfully',
    };
  }
}
