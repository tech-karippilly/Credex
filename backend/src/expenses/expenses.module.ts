import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { ExpenseExcelService } from './services/expense-excel.service';
import { ExpenseReportService } from './services/expense-report.service';
import { ReceiptAiService } from './services/receipt-ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }]),
    CloudinaryModule,
    AiModule,
    AuthModule,
    RbacModule,
    ExpenseCategoriesModule,
  ],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    ReceiptAiService,
    ExpenseReportService,
    ExpenseExcelService,
  ],
})
export class ExpensesModule {}
