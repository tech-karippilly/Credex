import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const RESUME_MAX_BYTES = 10 * 1024 * 1024;

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async create(@Body() createApplicationDto: CreateApplicationDto) {
    const data = await this.applicationsService.create(createApplicationDto);

    return {
      success: true,
      message: 'Application submitted successfully',
      data,
    };
  }

  @Post(':id/resume')
  @UseInterceptors(
    FileInterceptor('resume', {
      limits: { fileSize: RESUME_MAX_BYTES },
    }),
  )
  async uploadResume(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.applicationsService.uploadResume(id, file);

    return {
      success: true,
      message: 'Resume uploaded successfully',
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAll(@Query() query: ListApplicationsQueryDto) {
    const data = await this.applicationsService.findAll(query.careerId);

    return {
      success: true,
      message: 'Applications fetched successfully',
      data,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findOne(@Param('id') id: string) {
    const data = await this.applicationsService.findOne(id);

    return {
      success: true,
      message: 'Application fetched successfully',
      data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateApplicationStatusDto: UpdateApplicationStatusDto,
  ) {
    const data = await this.applicationsService.updateStatus(
      id,
      updateApplicationStatusDto.status,
    );

    return {
      success: true,
      message: 'Application status updated successfully',
      data,
    };
  }

  @Post(':id/analyze')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async analyze(@Param('id') id: string) {
    const data = await this.applicationsService.analyze(id);

    return {
      success: true,
      message: 'Application analyzed successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.applicationsService.remove(id);

    return {
      success: true,
      message: 'Application deleted successfully',
    };
  }
}
