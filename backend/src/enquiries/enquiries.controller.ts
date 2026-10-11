import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { EnquiriesService } from './enquiries.service';

@Controller('enquiries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Get()
  @RequirePermissions('enquiries.read')
  async list() {
    const data = await this.enquiriesService.list();

    return {
      success: true,
      message: 'Enquiries fetched successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('enquiries.delete')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.enquiriesService.remove(id);

    return {
      success: true,
      message: 'Enquiry deleted successfully',
    };
  }
}
