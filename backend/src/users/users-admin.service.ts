import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuthService } from '../auth/auth.service';
import { DelegationService } from '../rbac/delegation.service';
import { RbacAuditService } from '../rbac/rbac-audit.service';
import { RolesService } from '../rbac/roles.service';
import { UserRolesService } from '../rbac/user-roles.service';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserDocument } from './schemas/user.schema';
import { isUserActive, isUserSuperAdmin } from './utils/user-account.util';
import { UsersService } from './users.service';

export interface ManagedRole {
  id: string;
  name: string;
  key: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roles: ManagedRole[];
  createdAt: string | null;
}

@Injectable()
export class UsersAdminService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly userRoles: UserRolesService,
    private readonly rolesService: RolesService,
    private readonly delegation: DelegationService,
    private readonly audit: RbacAuditService,
  ) {}

  async list(query: UserQueryDto) {
    const page = await this.usersService.list(query);
    const items = await this.presentMany(page.users);
    return {
      items,
      page: page.page,
      limit: page.limit,
      total: page.total,
      totalPages: page.total === 0 ? 0 : Math.ceil(page.total / page.limit),
    };
  }

  async get(id: string): Promise<ManagedUser> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const [presented] = await this.presentMany([user]);
    return presented;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<ManagedUser> {
    const passwordHash = await this.authService.hashPassword(dto.password);
    const created = await this.usersService.create(dto, passwordHash);
    await this.audit.record({
      actor,
      action: 'user.created',
      targetType: 'user',
      targetId: created.id,
      summary: `Created user ${created.email}`,
    });
    return this.get(created.id);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<ManagedUser> {
    if (!dto.name && !dto.email && !dto.password) {
      throw new BadRequestException('No user changes were provided');
    }

    const passwordHash = dto.password
      ? await this.authService.hashPassword(dto.password)
      : undefined;
    const updated = await this.usersService.updateManagedUser(id, {
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    await this.audit.record({
      actor,
      action: 'user.updated',
      targetType: 'user',
      targetId: updated._id.toString(),
      summary: `Updated user ${updated.email}`,
    });

    return this.get(updated._id.toString());
  }

  async setStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserStatusDto,
  ): Promise<ManagedUser> {
    await this.usersService.setActiveStatus(id, dto.isActive);
    const user = await this.get(id);
    await this.audit.record({
      actor,
      action: dto.isActive ? 'user.activated' : 'user.deactivated',
      targetType: 'user',
      targetId: id,
      summary: `${dto.isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
    });
    return user;
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const user = await this.get(id);
    await this.usersService.deleteById(id);
    await this.userRoles.removeAllForUser(id);
    await this.audit.record({
      actor,
      action: 'user.deleted',
      targetType: 'user',
      targetId: id,
      summary: `Deleted user ${user.email}`,
    });
  }

  async roles(id: string): Promise<ManagedRole[]> {
    const user = await this.get(id);
    return user.roles;
  }

  async assignRole(
    actor: AuthenticatedUser,
    id: string,
    dto: AssignUserRoleDto,
  ): Promise<ManagedRole[]> {
    await this.delegation.assertCanChangeUserRoles(actor, id, dto.roleId);
    await this.userRoles.assign(id, dto.roleId);
    const role = await this.rolesService.findById(dto.roleId);
    await this.audit.record({
      actor,
      action: 'user.role.assigned',
      targetType: 'user',
      targetId: id,
      summary: `Assigned role ${role?.key ?? dto.roleId}`,
    });
    return this.roles(id);
  }

  async removeRole(
    actor: AuthenticatedUser,
    id: string,
    roleId: string,
  ): Promise<ManagedRole[]> {
    await this.delegation.assertCanChangeUserRoles(actor, id, roleId);
    await this.userRoles.revoke(id, roleId);
    const role = await this.rolesService.findById(roleId);
    await this.audit.record({
      actor,
      action: 'user.role.removed',
      targetType: 'user',
      targetId: id,
      summary: `Removed role ${role?.key ?? roleId}`,
    });
    return this.roles(id);
  }

  private async presentMany(users: UserDocument[]): Promise<ManagedUser[]> {
    const roleIdsByUser = await this.userRoles.listRoleIdsForUsers(
      users.map((user) => user._id.toString()),
    );
    const roleIds = [
      ...new Set([...roleIdsByUser.values()].flatMap((ids) => ids)),
    ];
    const roles = await this.rolesService.findByIds(roleIds);
    const rolesById = new Map(
      roles.map((role) => [
        role._id.toString(),
        { id: role._id.toString(), name: role.name, key: role.key },
      ]),
    );

    return users.map((user) => {
      const assigned = roleIdsByUser.get(user._id.toString()) ?? [];
      const createdAt = user.get('createdAt');
      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isActive: isUserActive(user),
        isSuperAdmin: isUserSuperAdmin(user),
        roles: assigned
          .map((roleId) => rolesById.get(roleId))
          .filter((role): role is ManagedRole => Boolean(role)),
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : null,
      };
    });
  }
}
