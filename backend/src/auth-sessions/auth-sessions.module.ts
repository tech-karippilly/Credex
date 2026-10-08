import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSessionsService } from './auth-sessions.service';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthSession.name, schema: AuthSessionSchema },
    ]),
  ],
  providers: [AuthSessionsService],
  exports: [AuthSessionsService],
})
export class AuthSessionsModule {}
