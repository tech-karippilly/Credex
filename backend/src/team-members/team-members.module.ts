import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { RbacModule } from '../rbac/rbac.module';
import { TeamMember, TeamMemberSchema } from './schemas/team-member.schema';
import { TeamMembersController } from './team-members.controller';
import { TeamMembersService } from './team-members.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamMember.name, schema: TeamMemberSchema },
    ]),
    AuthModule,
    RbacModule,
    CloudinaryModule,
  ],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
  exports: [TeamMembersService],
})
export class TeamMembersModule {}
