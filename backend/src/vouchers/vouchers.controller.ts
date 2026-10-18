import {
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
import {
  RequirePermissions,
  RequirePermissionsWhenPresent,
} from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import {
  VOUCHER_DOCUMENT_MAX_BYTES,
  VOUCHER_DOCUMENT_MIME_REGEX,
} from './constants/voucher.constants';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { UpdateVoucherStatusDto } from './dto/update-voucher-status.dto';
import { SendVoucherEmailDto } from './dto/send-voucher-email.dto';
import { SendVoucherWhatsappDto } from './dto/send-voucher-whatsapp.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VoucherSharingService } from './services/voucher-sharing.service';
import { VouchersService } from './vouchers.service';

const documentFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: VOUCHER_DOCUMENT_MAX_BYTES }),
    new FileTypeValidator({ fileType: VOUCHER_DOCUMENT_MIME_REGEX }),
  ],
});

@Controller('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly voucherSharingService: VoucherSharingService,
  ) {}

  @Post()
  @RequirePermissions('vouchers.create')
  async create(@Body() createVoucherDto: CreateVoucherDto) {
    const data = await this.vouchersService.create(createVoucherDto);

    return {
      success: true,
      message: 'Voucher created successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('vouchers.read')
  async findAll(@Query() query: VoucherQueryDto) {
    const data = await this.vouchersService.findAll(query);

    return {
      success: true,
      message: 'Vouchers fetched successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('vouchers.read')
  async findOne(@Param('id') id: string) {
    const data = await this.vouchersService.findOne(id);

    return {
      success: true,
      message: 'Voucher fetched successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('vouchers.update')
  @RequirePermissionsWhenPresent('status', 'vouchers.status.update')
  async update(
    @Param('id') id: string,
    @Body() updateVoucherDto: UpdateVoucherDto,
  ) {
    const data = await this.vouchersService.update(id, updateVoucherDto);

    return {
      success: true,
      message: 'Voucher updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('vouchers.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateVoucherStatusDto,
  ) {
    const data = await this.vouchersService.updateStatus(
      id,
      updateStatusDto.status,
    );

    return {
      success: true,
      message: 'Voucher status updated successfully',
      data,
    };
  }

  @Delete(':id')
  @RequirePermissions('vouchers.delete')
  async remove(@Param('id') id: string) {
    await this.vouchersService.remove(id);

    return {
      success: true,
      message: 'Voucher deleted successfully',
    };
  }

  @Post(':id/document')
  @RequirePermissions('vouchers.update')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile(documentFilePipe) file: Express.Multer.File,
  ) {
    const data = await this.vouchersService.uploadDocument(id, file);

    return {
      success: true,
      message: 'Voucher document uploaded successfully',
      data,
    };
  }

  @Delete(':id/document')
  @RequirePermissions('vouchers.update')
  async removeDocument(@Param('id') id: string) {
    const data = await this.vouchersService.removeDocument(id);

    return {
      success: true,
      message: 'Voucher document removed successfully',
      data,
    };
  }

  @Post(':id/send-email')
  @RequirePermissions('vouchers.send_email')
  async sendEmail(@Param('id') id: string, @Body() dto: SendVoucherEmailDto) {
    const data = await this.voucherSharingService.sendEmail(id, dto);

    return {
      success: true,
      message: 'Voucher email sent successfully',
      data,
    };
  }

  @Post(':id/send-whatsapp')
  @RequirePermissions('vouchers.send_whatsapp')
  async sendWhatsapp(
    @Param('id') id: string,
    @Body() dto: SendVoucherWhatsappDto,
  ) {
    const data = await this.voucherSharingService.sendWhatsapp(id, dto);

    return {
      success: true,
      message: 'Voucher WhatsApp message sent successfully',
      data,
    };
  }
}
