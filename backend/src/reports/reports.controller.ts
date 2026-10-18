import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { ExpenseLedgerQueryDto } from './dto/expense-ledger-query.dto';
import { PaymentReportQueryDto } from './dto/payment-report-query.dto';
import { VoucherReportQueryDto } from './dto/voucher-report-query.dto';
import { ExpenseLedgerReportService } from './services/expense-ledger-report.service';
import { PaymentReportService } from './services/payment-report.service';
import { ReportExcelService } from './services/report-excel.service';
import { VoucherReportService } from './services/voucher-report.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly expenseReports: ExpenseLedgerReportService,
    private readonly voucherReports: VoucherReportService,
    private readonly paymentReports: PaymentReportService,
    private readonly excel: ReportExcelService,
  ) {}

  @Get('expenses/export')
  @RequirePermissions('reports.export')
  async exportExpenses(
    @Query() query: ExpenseLedgerQueryDto,
    @Res() res: Response,
  ) {
    this.sendWorkbook(res, await this.excel.exportExpenses(query));
  }

  @Get('expenses')
  @RequirePermissions('reports.read')
  async expenses(@Query() query: ExpenseLedgerQueryDto) {
    return {
      success: true,
      message: 'Expense report generated successfully',
      data: await this.expenseReports.generate(query),
    };
  }

  @Get('vouchers/export')
  @RequirePermissions('reports.export')
  async exportVouchers(
    @Query() query: VoucherReportQueryDto,
    @Res() res: Response,
  ) {
    this.sendWorkbook(res, await this.excel.exportVouchers(query));
  }

  @Get('vouchers')
  @RequirePermissions('reports.read')
  async vouchers(@Query() query: VoucherReportQueryDto) {
    return {
      success: true,
      message: 'Voucher report generated successfully',
      data: await this.voucherReports.generate(query),
    };
  }

  @Get('payments/export')
  @RequirePermissions('reports.export')
  async exportPayments(
    @Query() query: PaymentReportQueryDto,
    @Res() res: Response,
  ) {
    this.sendWorkbook(res, await this.excel.exportPayments(query));
  }

  @Get('payments')
  @RequirePermissions('reports.read')
  async payments(@Query() query: PaymentReportQueryDto) {
    return {
      success: true,
      message: 'Payment report generated successfully',
      data: await this.paymentReports.generate(query),
    };
  }

  private sendWorkbook(
    res: Response,
    file: { buffer: Buffer; filename: string },
  ): void {
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(file.buffer);
  }
}
