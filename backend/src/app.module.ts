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
import { CareersModule } from './careers/careers.module';
import { ServicesModule } from './services/services.module';
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
    CloudinaryModule,
    EmailModule,
    AiModule,
    HealthModule,
    ServicesModule,
    CareersModule,
  ],
})
export class AppModule {}
