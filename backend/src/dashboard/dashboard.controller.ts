import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { DashboardService } from './dashboard.service';
import { ExpensesSummaryQueryDto } from './dto/expenses-summary-query.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('expenses-summary')
  @RequirePermissions('dashboard.expenses_summary.read')
  async expensesSummary(@Query() query: ExpensesSummaryQueryDto) {
    const data = await this.dashboardService.getExpensesSummary(query.month);

    return {
      success: true,
      message: 'Expenses summary fetched successfully',
      data,
    };
  }

  @Get('expenses-by-category')
  @RequirePermissions('dashboard.expenses_by_category.read')
  async expensesByCategory(@Query() query: ExpensesSummaryQueryDto) {
    const data = await this.dashboardService.getExpensesByCategory(query.month);

    return {
      success: true,
      message: 'Expenses by category fetched successfully',
      data,
    };
  }
}
