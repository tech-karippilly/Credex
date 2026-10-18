import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  RequirePermissions,
  RequirePermissionsWhenPresent,
} from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { LEAD_IMPORT_MAX_BYTES } from './constants/lead.constants';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadActivityQueryDto } from './dto/lead-activity-query.dto';
import { LeadExportQueryDto } from './dto/lead-export-query.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';
import { LeadsService } from './leads.service';
import { LeadExcelService } from './services/lead-excel.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadExcelService: LeadExcelService,
  ) {}

  @Get()
  @RequirePermissions('leads.read')
  async findAll(@Query() query: LeadQueryDto) {
    return {
      success: true,
      message: 'Leads fetched successfully',
      data: await this.leadsService.findAll(query),
    };
  }

  @Get('summary')
  @RequirePermissions('leads.read')
  async summary(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Lead summary fetched successfully',
      data: await this.leadsService.summary(user),
    };
  }

  @Get('assignees')
  @RequirePermissions('leads.read')
  async assignees() {
    return {
      success: true,
      message: 'Lead assignees fetched successfully',
      data: await this.leadsService.listAssignees(),
    };
  }

  @Get('import/template')
  @RequirePermissions('leads.import')
  async template(@Res() res: Response) {
    const file = await this.leadExcelService.template();
    this.sendFile(res, file);
  }

  @Post('import/preview')
  @RequirePermissions('leads.import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LEAD_IMPORT_MAX_BYTES } }),
  )
  async preview(@UploadedFile() file: Express.Multer.File) {
    return {
      success: true,
      message: 'Import preview generated successfully',
      data: await this.leadExcelService.preview(file),
    };
  }

  @Post('import')
  @RequirePermissions('leads.import')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LEAD_IMPORT_MAX_BYTES } }),
  )
  async commit(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Leads imported successfully',
      data: await this.leadExcelService.commit(file, user),
    };
  }

  @Get('export')
  @RequirePermissions('leads.export')
  async export(@Query() query: LeadExportQueryDto, @Res() res: Response) {
    const file = await this.leadExcelService.export(query);
    this.sendFile(res, file);
  }

  @Get(':id')
  @RequirePermissions('leads.read')
  async findOne(@Param('id') id: string) {
    return {
      success: true,
      message: 'Lead fetched successfully',
      data: await this.leadsService.findOne(id),
    };
  }

  @Post()
  @RequirePermissions('leads.create')
  @RequirePermissionsWhenPresent('assignedUserId', 'leads.assign')
  async create(
    @Body() dto: CreateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Lead created successfully',
      data: await this.leadsService.create(dto, user),
    };
  }

  @Put(':id')
  @RequirePermissions('leads.update')
  @RequirePermissionsWhenPresent('assignedUserId', 'leads.assign')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Lead updated successfully',
      data: await this.leadsService.update(id, dto, user),
    };
  }

  @Patch(':id/stage')
  @RequirePermissions('leads.update')
  async updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateLeadStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Lead stage updated successfully',
      data: await this.leadsService.updateStage(id, dto.stage, user),
    };
  }

  @Delete(':id')
  @RequirePermissions('leads.delete')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.leadsService.remove(id, user);
    return {
      success: true,
      message: 'Lead deleted successfully',
    };
  }

  @Get(':id/activities')
  @RequirePermissions('leads.read')
  async activities(
    @Param('id') id: string,
    @Query() query: LeadActivityQueryDto,
  ) {
    return {
      success: true,
      message: 'Lead activities fetched successfully',
      data: await this.leadsService.listActivities(id, query),
    };
  }

  @Post(':id/activities')
  @RequirePermissions('leads.update')
  async addActivity(
    @Param('id') id: string,
    @Body() dto: CreateLeadActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return {
      success: true,
      message: 'Lead activity recorded successfully',
      data: await this.leadsService.addActivity(id, dto, user),
    };
  }

  private sendFile(
    res: Response,
    file: { buffer: Buffer; filename: string; contentType: string },
  ): void {
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(file.buffer);
  }
}
