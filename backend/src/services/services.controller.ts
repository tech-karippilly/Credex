import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

const SERVICE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async findAll() {
    const data = await this.servicesService.findAll();

    return {
      success: true,
      message: 'Services fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.servicesService.findOne(id);

    return {
      success: true,
      message: 'Service fetched successfully',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('services.create')
  async create(@Body() createServiceDto: CreateServiceDto) {
    const data = await this.servicesService.create(createServiceDto);

    return {
      success: true,
      message: 'Service created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('services.update')
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const data = await this.servicesService.update(id, updateServiceDto);

    return {
      success: true,
      message: 'Service updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('services.delete')
  async remove(@Param('id') id: string) {
    await this.servicesService.remove(id);

    return {
      success: true,
      message: 'Service deleted successfully',
    };
  }

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('services.update')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: SERVICE_IMAGE_MAX_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.servicesService.uploadImage(id, file);

    return {
      success: true,
      message: 'Service image uploaded successfully',
      data,
    };
  }

  @Delete(':id/image')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('services.update')
  async removeImage(@Param('id') id: string) {
    const data = await this.servicesService.removeImage(id);

    return {
      success: true,
      message: 'Service image removed successfully',
      data,
    };
  }
}
