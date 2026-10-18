import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RbacModule } from '../rbac/rbac.module';
import { SiteContactController } from './site-contact.controller';
import { SiteContactService } from './site-contact.service';
import { SiteContact, SiteContactSchema } from './schemas/site-contact.schema';

@Module({
  imports: [
    AuthModule,
    CloudinaryModule,
    RbacModule,
    MongooseModule.forFeature([
      { name: SiteContact.name, schema: SiteContactSchema },
    ]),
  ],
  controllers: [SiteContactController],
  providers: [SiteContactService],
  exports: [SiteContactService],
})
export class SiteContactModule {}
