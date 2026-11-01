import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { RbacModule } from '../rbac/rbac.module';
import { FixedExpensesController } from './fixed-expenses.controller';
import { FixedExpensesService } from './fixed-expenses.service';
import { FixedExpense, FixedExpenseSchema } from './schemas/fixed-expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FixedExpense.name, schema: FixedExpenseSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
    AuthModule,
    RbacModule,
    ExpenseCategoriesModule,
    ExpensesModule,
  ],
  controllers: [FixedExpensesController],
  providers: [FixedExpensesService],
})
export class FixedExpensesModule {}
