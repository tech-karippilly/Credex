import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { SalariesService } from './salaries.service';

@Controller('salaries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Get()
  @RequirePermissions('salaries.read')
  async list() {
    const data = await this.salariesService.list();
    return {
      success: true,
      message: 'Salaries fetched successfully',
      data,
    };
  }

  @Put(':employeeId')
  @RequirePermissions('salaries.update')
  async update(
    @Param('employeeId') employeeId: string,
    @Body() dto: UpdateSalaryDto,
  ) {
    const data = await this.salariesService.update(employeeId, dto);
    return {
      success: true,
      message: 'Salary saved successfully',
      data,
    };
  }
}
