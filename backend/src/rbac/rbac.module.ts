import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AccessController } from './access.controller';
import { DelegationService } from './delegation.service';
import { EffectivePermissionsService } from './effective-permissions.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RbacAuditService } from './rbac-audit.service';
import { RbacBootstrapService } from './rbac-bootstrap.service';
import { RolePermissionsService } from './role-permissions.service';
import { RolesAdminService } from './roles-admin.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { RbacAudit, RbacAuditSchema } from './schemas/rbac-audit.schema';
import {
  RolePermission,
  RolePermissionSchema,
} from './schemas/role-permission.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { UserRole, UserRoleSchema } from './schemas/user-role.schema';
import { UserRolesService } from './user-roles.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: RolePermission.name, schema: RolePermissionSchema },
      { name: RbacAudit.name, schema: RbacAuditSchema },
    ]),
  ],
  controllers: [AccessController, RolesController, PermissionsController],
  providers: [
    RolesService,
    PermissionsService,
    UserRolesService,
    RolePermissionsService,
    EffectivePermissionsService,
    PermissionsGuard,
    RbacBootstrapService,
    DelegationService,
    RbacAuditService,
    RolesAdminService,
  ],
  exports: [
    RolesService,
    PermissionsService,
    UserRolesService,
    RolePermissionsService,
    EffectivePermissionsService,
    PermissionsGuard,
    RbacBootstrapService,
    DelegationService,
    RbacAuditService,
    RolesAdminService,
  ],
})
export class RbacModule {}
