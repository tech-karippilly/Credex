import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  async create(@Body() createEnquiryDto: CreateEnquiryDto) {
    const data = await this.enquiriesService.create(createEnquiryDto);

    return {
      success: true,
      message: 'Enquiry submitted successfully',
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('enquiries.delete')
  async remove(@Param('id') id: string) {
    await this.enquiriesService.remove(id);

    return {
      success: true,
      message: 'Enquiry deleted successfully',
    };
  }
}
