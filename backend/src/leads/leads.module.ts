import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadActivity, LeadActivitySchema } from './schemas/lead-activity.schema';
import { Lead, LeadSchema } from './schemas/lead.schema';
import { LeadExcelService } from './services/lead-excel.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: LeadActivity.name, schema: LeadActivitySchema },
    ]),
    UsersModule,
    AuthModule,
    RbacModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadExcelService],
  exports: [LeadsService],
})
export class LeadsModule {}
