import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailModule } from '../email/email.module';
import { ExpenseCategoriesModule } from '../expense-categories/expense-categories.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import {
  VoucherCounter,
  VoucherCounterSchema,
} from './schemas/voucher-counter.schema';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { VoucherNumberService } from './services/voucher-number.service';
import { VoucherPdfService } from './services/voucher-pdf.service';
import { VoucherSharingService } from './services/voucher-sharing.service';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Voucher.name, schema: VoucherSchema },
      { name: VoucherCounter.name, schema: VoucherCounterSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
    CloudinaryModule,
    AuthModule,
    ExpenseCategoriesModule,
    EmailModule,
    WhatsappModule,
  ],
  controllers: [VouchersController],
  providers: [
    VouchersService,
    VoucherNumberService,
    VoucherPdfService,
    VoucherSharingService,
  ],
})
export class VouchersModule {}
