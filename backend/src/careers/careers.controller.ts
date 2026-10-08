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
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CareersService } from './careers.service';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';
import { UpdateCareerVisibilityDto } from './dto/update-career-visibility.dto';

@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAllAdmin() {
    const data = await this.careersService.findAllAdmin();

    return {
      success: true,
      message: 'Careers fetched successfully',
      data,
    };
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() createCareerDto: CreateCareerDto) {
    const data = await this.careersService.create(createCareerDto);

    return {
      success: true,
      message: 'Career created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    await this.careersService.remove(id);

    return {
      success: true,
      message: 'Career deleted successfully',
    };
  }
}
