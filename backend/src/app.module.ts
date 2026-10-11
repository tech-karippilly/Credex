import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { ApplicationsModule } from './applications/applications.module';
import { CareersModule } from './careers/careers.module';
import { ServicesModule } from './services/services.module';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { SiteContactModule } from './site-contact/site-contact.module';
import { RbacModule } from './rbac/rbac.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    RbacModule,
    CloudinaryModule,
    EmailModule,
    AiModule,
    HealthModule,
    ServicesModule,
    CareersModule,
    ApplicationsModule,
    SiteContactModule,
    EnquiriesModule,
    ExpenseCategoriesModule,
    ExpensesModule,
    VouchersModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule {}
