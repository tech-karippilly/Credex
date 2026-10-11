import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSessionsModule } from '../auth-sessions/auth-sessions.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersAdminService } from './users-admin.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthSessionsModule,
    forwardRef(() => AuthModule),
    forwardRef(() => RbacModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersAdminService],
  exports: [UsersService],
})
export class UsersModule {}
