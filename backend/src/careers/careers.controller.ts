import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequirePermissions,
  RequirePermissionsWhenPresent,
} from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CareersService } from './careers.service';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';
import { UpdateCareerVisibilityDto } from './dto/update-career-visibility.dto';

@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.read')
  async findAllAdmin() {
    const data = await this.careersService.findAllAdmin();

    return {
      success: true,
      message: 'Careers fetched successfully',
      data,
    };
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.read')
  async findOneAdmin(@Param('id') id: string) {
    const data = await this.careersService.findOneAdmin(id);

    return {
      success: true,
      message: 'Career fetched successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.careersService.findAllVisible();

    return {
      success: true,
      message: 'Careers fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.careersService.findOneVisible(id);

    return {
      success: true,
      message: 'Career fetched successfully',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.create')
  async create(@Body() createCareerDto: CreateCareerDto) {
    const data = await this.careersService.create(createCareerDto);

    return {
      success: true,
      message: 'Career created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.update')
  @RequirePermissionsWhenPresent('isVisible', 'careers.status.update')
  async update(
    @Param('id') id: string,
    @Body() updateCareerDto: UpdateCareerDto,
  ) {
    const data = await this.careersService.update(id, updateCareerDto);

    return {
      success: true,
      message: 'Career updated successfully',
      data,
    };
  }

  @Patch(':id/visibility')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.status.update')
  async updateVisibility(
    @Param('id') id: string,
    @Body() updateCareerVisibilityDto: UpdateCareerVisibilityDto,
  ) {
    const data = await this.careersService.updateVisibility(
      id,
      updateCareerVisibilityDto.isVisible,
    );

    return {
      success: true,
      message: 'Career visibility updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('careers.delete')
  async remove(@Param('id') id: string) {
    await this.careersService.remove(id);

    return {
      success: true,
      message: 'Career deleted successfully',
    };
  }
}
