import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { AttendanceService } from './attendance.service';
import { AttendanceDayQueryDto } from './dto/attendance-day-query.dto';
import { SaveAttendanceDayDto } from './dto/save-attendance-day.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @RequirePermissions('attendance.read')
  async getDay(@Query() query: AttendanceDayQueryDto) {
    const data = await this.attendanceService.getDay(query);
    return {
      success: true,
      message: 'Attendance fetched successfully',
      data,
    };
  }

  @Put('day')
  @RequirePermissions('attendance.update')
  async saveDay(
    @Body() dto: SaveAttendanceDayDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.attendanceService.saveDay(dto, user.userId);
    return {
      success: true,
      message: 'Attendance saved successfully',
      data,
    };
  }
}
