import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { CareersModule } from '../careers/careers.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ResumeContentService } from './resume-content.service';
import { Application, ApplicationSchema } from './schemas/application.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
    ]),
    AuthModule,
    RbacModule,
    CareersModule,
    CloudinaryModule,
    AiModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ResumeContentService],
})
export class ApplicationsModule {}
