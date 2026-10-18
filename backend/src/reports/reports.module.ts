import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import {
  ExpenseCategory,
  ExpenseCategorySchema,
} from '../expense-categories/schemas/expense-category.schema';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import {
  PaymentAllocation,
  PaymentAllocationSchema,
} from '../payments/schemas/payment-allocation.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Voucher, VoucherSchema } from '../vouchers/schemas/voucher.schema';
import { ReportsController } from './reports.controller';
import { ExpenseLedgerReportService } from './services/expense-ledger-report.service';
import { PaymentReportService } from './services/payment-report.service';
import { ReportExcelService } from './services/report-excel.service';
import { VoucherReportService } from './services/voucher-report.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: ExpenseCategory.name, schema: ExpenseCategorySchema },
      { name: Voucher.name, schema: VoucherSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentAllocation.name, schema: PaymentAllocationSchema },
    ]),
    AuthModule,
    RbacModule,
  ],
  controllers: [ReportsController],
  providers: [
    ExpenseLedgerReportService,
    VoucherReportService,
    PaymentReportService,
    ReportExcelService,
  ],
})
export class ReportsModule {}
