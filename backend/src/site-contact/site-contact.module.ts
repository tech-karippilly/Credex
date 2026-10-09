import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SiteContactController } from './site-contact.controller';
import { SiteContactService } from './site-contact.service';
import {
  SiteContact,
  SiteContactSchema,
} from './schemas/site-contact.schema';

@Module({
  imports: [
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: SiteContact.name, schema: SiteContactSchema },
    ]),
  ],
  controllers: [SiteContactController],
  providers: [SiteContactService],
  exports: [SiteContactService],
})
export class SiteContactModule {}
