import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { EMPLOYEE_DOCUMENT_MAX_BYTES } from './constants/employee.constants';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('summary')
  @RequirePermissions('employees.read')
  async summary() {
    const data = await this.employeesService.summary();
    return {
      success: true,
      message: 'Employee summary fetched successfully',
      data,
    };
  }

  @Get('options')
  @RequirePermissions('employees.read')
  async options() {
    const data = await this.employeesService.options();
    return {
      success: true,
      message: 'Employee options fetched successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('employees.read')
  async list(@Query() query: EmployeeQueryDto) {
    const data = await this.employeesService.list(query);
    return {
      success: true,
      message: 'Employees fetched successfully',
      data,
    };
  }

  @Get('setup')
  @RequirePermissions('employees.read')
  async setup() {
    const data = await this.employeesService.jobSetup();
    return {
      success: true,
      message: 'Employee departments and designations fetched successfully',
      data,
    };
  }

  @Post('departments')
  @RequirePermissions('employees.update')
  async createDepartment(@Body() dto: CreateDesignationDto) {
    const data = await this.employeesService.createDepartment(dto.name);
    return {
      success: true,
      message: 'Department added successfully',
      data,
    };
  }

  @Put('departments/:id')
  @RequirePermissions('employees.update')
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: CreateDesignationDto,
  ) {
    const data = await this.employeesService.updateDepartment(id, dto.name);
    return {
      success: true,
      message: 'Department updated successfully',
      data,
    };
  }

  @Delete('departments/:id')
  @RequirePermissions('employees.update')
  async removeDepartment(@Param('id') id: string) {
    await this.employeesService.removeDepartment(id);
    return {
      success: true,
      message: 'Department removed successfully',
    };
  }

  @Post('designations')
  @RequirePermissions('employees.update')
  async createDesignation(@Body() dto: CreateDesignationDto) {
    const data = await this.employeesService.createDesignation(dto.name);
    return {
      success: true,
      message: 'Designation added successfully',
      data,
    };
  }

  @Delete('designations/:id')
  @RequirePermissions('employees.update')
  async removeDesignation(@Param('id') id: string) {
    await this.employeesService.removeDesignation(id);
    return {
      success: true,
      message: 'Designation removed successfully',
    };
  }

  @Get(':id')
  @RequirePermissions('employees.read')
  async findOne(@Param('id') id: string) {
    const data = await this.employeesService.findOne(id);
    return {
      success: true,
      message: 'Employee fetched successfully',
      data,
    };
  }

  @Post()
  @RequirePermissions('employees.create')
  async create(@Body() dto: CreateEmployeeDto) {
    const data = await this.employeesService.create(dto);
    return {
      success: true,
      message: 'Employee added successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('employees.update')
  async update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const data = await this.employeesService.update(id, dto);
    return {
      success: true,
      message: 'Employee updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('employees.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    const data = await this.employeesService.updateStatus(id, dto.status);
    return {
      success: true,
      message: 'Employee status updated successfully',
      data,
    };
  }

  @Post(':id/documents/:kind')
  @RequirePermissions('employees.update')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: EMPLOYEE_DOCUMENT_MAX_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png|application\/pdf)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    const data = await this.employeesService.uploadDocument(id, kind, file);
    return {
      success: true,
      message: 'Document uploaded successfully',
      data,
    };
  }

  @Delete(':id/documents/:kind')
  @RequirePermissions('employees.update')
  async removeDocument(@Param('id') id: string, @Param('kind') kind: string) {
    const data = await this.employeesService.removeDocument(id, kind);
    return {
      success: true,
      message: 'Document removed successfully',
      data,
    };
  }
}
