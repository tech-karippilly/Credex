import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import {
  EXPENSE_RECEIPT_MAX_BYTES,
  EXPENSE_RECEIPT_MIME_REGEX,
} from './constants/expense-categories';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseQueryDto } from './dto/expense-query.dto';
import { ExpenseReportQueryDto } from './dto/expense-report-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';
import { ExpenseExcelService } from './services/expense-excel.service';
import { ExpenseReportService } from './services/expense-report.service';
import { ReceiptAiService } from './services/receipt-ai.service';

const receiptFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: EXPENSE_RECEIPT_MAX_BYTES }),
    new FileTypeValidator({ fileType: EXPENSE_RECEIPT_MIME_REGEX }),
  ],
});

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
    private readonly receiptAiService: ReceiptAiService,
    private readonly expenseReportService: ExpenseReportService,
    private readonly expenseExcelService: ExpenseExcelService,
  ) {}

  @Post('receipt/analyze')
  @RequirePermissions('expenses.analyze')
  @UseInterceptors(FileInterceptor('receipt'))
  async analyzeReceipt(
    @UploadedFile(receiptFilePipe) file: Express.Multer.File,
  ) {
    const data = await this.receiptAiService.analyzeReceipt(file);

    return {
      success: true,
      message: 'Receipt analyzed successfully',
      data,
    };
  }

  @Get('reports/export')
  @RequirePermissions('expenses.export')
  async exportReport(
    @Query() query: ExpenseReportQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.expenseExcelService.export(query);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('reports')
  @RequirePermissions('expenses.read')
  async getReport(@Query() query: ExpenseReportQueryDto) {
    const data = await this.expenseReportService.generateReport(query);

    const message =
      query.type === 'date-wise'
        ? 'Date-wise expense report generated successfully'
        : query.type === 'month-wise'
          ? 'Month-wise expense report generated successfully'
          : 'Category-wise expense report generated successfully';

    return {
      success: true,
      message,
      data,
    };
  }

  @Post()
  @RequirePermissions('expenses.create')
  async create(@Body() createExpenseDto: CreateExpenseDto) {
    const data = await this.expensesService.create(createExpenseDto);

    return {
      success: true,
      message: 'Expense created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('expenses.read')
  async findAll(@Query() query: ExpenseQueryDto) {
    const data = await this.expensesService.findAll(query);

    return {
      success: true,
      message: 'Expenses fetched successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  async findOne(@Param('id') id: string) {
    const data = await this.expensesService.findOne(id);

    return {
      success: true,
      message: 'Expense fetched successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('expenses.update')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    const data = await this.expensesService.update(id, updateExpenseDto);

    return {
      success: true,
      message: 'Expense updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  async remove(@Param('id') id: string) {
    await this.expensesService.remove(id);

    return {
      success: true,
      message: 'Expense deleted successfully',
    };
  }

  @Post(':id/receipt')
  @RequirePermissions('expenses.update')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @Param('id') id: string,
    @UploadedFile(receiptFilePipe) file: Express.Multer.File,
  ) {
    const data = await this.expensesService.uploadReceipt(id, file);

    return {
      success: true,
      message: 'Receipt uploaded successfully',
      data,
    };
  }

  @Delete(':id/receipt')
  @RequirePermissions('expenses.update')
  async removeReceipt(@Param('id') id: string) {
    const data = await this.expensesService.removeReceipt(id);

    return {
      success: true,
      message: 'Receipt removed successfully',
      data,
    };
  }
}
