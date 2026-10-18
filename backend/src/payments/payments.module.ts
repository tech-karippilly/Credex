import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  PaymentAllocation,
  PaymentAllocationSchema,
} from './schemas/payment-allocation.schema';
import {
  PaymentAudit,
  PaymentAuditSchema,
} from './schemas/payment-audit.schema';
import {
  PaymentCounter,
  PaymentCounterSchema,
} from './schemas/payment-counter.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentAllocation.name, schema: PaymentAllocationSchema },
      { name: PaymentAudit.name, schema: PaymentAuditSchema },
      { name: PaymentCounter.name, schema: PaymentCounterSchema },
    ]),
    forwardRef(() => VouchersModule),
    AuthModule,
    RbacModule,
    CloudinaryModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [MongooseModule],
})
export class PaymentsModule {}
