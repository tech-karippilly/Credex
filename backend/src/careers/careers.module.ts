import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CareersController } from './careers.controller';
import { CareersService } from './careers.service';
import { Career, CareerSchema } from './schemas/career.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Career.name, schema: CareerSchema }]),
    AuthModule,
  ],
  controllers: [CareersController],
  providers: [CareersService],
  exports: [CareersService],
})
export class CareersModule {}
