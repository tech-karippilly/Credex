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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  PAYMENT_DOCUMENT_MAX_BYTES,
  PAYMENT_DOCUMENT_MIME_REGEX,
} from './constants/payment.constants';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EligibleVoucherQueryDto } from './dto/eligible-voucher-query.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

const documentFilePipe = new ParseFilePipe({
  validators: [
    new MaxFileSizeValidator({ maxSize: PAYMENT_DOCUMENT_MAX_BYTES }),
    new FileTypeValidator({ fileType: PAYMENT_DOCUMENT_MIME_REGEX }),
  ],
});

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermissions('payments.create')
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.paymentsService.create(dto, user);
    return {
      success: true,
      message: 'Payment recorded successfully',
      data,
    };
  }

  @Get()
  @RequirePermissions('payments.read')
  async findAll(@Query() query: PaymentQueryDto) {
    const data = await this.paymentsService.findAll(query);
    return {
      success: true,
      message: 'Payments fetched successfully',
      data,
    };
  }

  @Get('eligible-vouchers')
  @RequirePermissions('payments.read')
  async eligibleVouchers(@Query() query: EligibleVoucherQueryDto) {
    const data = await this.paymentsService.eligibleVouchers(query);
    return {
      success: true,
      message: 'Eligible vouchers fetched successfully',
      data,
    };
  }

  @Get(':id')
  @RequirePermissions('payments.read')
  async findOne(@Param('id') id: string) {
    const data = await this.paymentsService.findOne(id);
    return {
      success: true,
      message: 'Payment fetched successfully',
      data,
    };
  }

  @Put(':id')
  @RequirePermissions('payments.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.paymentsService.update(id, dto, user);
    return {
      success: true,
      message: 'Payment updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @RequirePermissions('payments.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.paymentsService.updateStatus(id, dto, user);
    return {
      success: true,
      message: 'Payment status updated successfully',
      data,
    };
  }

  @Post(':id/document')
  @RequirePermissions('payments.update')
  @UseInterceptors(FileInterceptor('document'))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile(documentFilePipe) file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.paymentsService.uploadDocument(id, file, user);
    return {
      success: true,
      message: 'Payment document uploaded successfully',
      data,
    };
  }

  @Delete(':id/document')
  @RequirePermissions('payments.update')
  async removeDocument(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.paymentsService.removeDocument(id, user);
    return {
      success: true,
      message: 'Payment document removed successfully',
      data,
    };
  }
}
