import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSiteContactDto } from './dto/update-site-contact.dto';
import { SiteContactService } from './site-contact.service';

const SITE_CONTACT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

@Controller('site-contact')
export class SiteContactController {
  constructor(private readonly siteContactService: SiteContactService) {}

  @Get()
  async findOne() {
    const data = await this.siteContactService.getOrCreate();

    return {
      success: true,
      message: 'Site contact fetched successfully',
      data,
    };
  }

  @Put()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Body() updateSiteContactDto: UpdateSiteContactDto) {
    const data = await this.siteContactService.update(updateSiteContactDto);

    return {
      success: true,
      message: 'Site contact updated successfully',
      data,
    };
  }

  @Post('images')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: SITE_CONTACT_IMAGE_MAX_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.siteContactService.uploadImage(file);

    return {
      success: true,
      message: 'Image uploaded successfully',
      data,
    };
  }
}
