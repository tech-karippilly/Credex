import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { SUPER_ADMIN_PROTECTED_MESSAGE } from '../users/constants/user.constants';
import { UsersService } from '../users/users.service';
import { isUserSuperAdmin } from '../users/utils/user-account.util';
import { RolesService } from './roles.service';
import { UserRole, UserRoleDocument } from './schemas/user-role.schema';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectModel(UserRole.name)
    private readonly userRoleModel: Model<UserRoleDocument>,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  async assign(userId: string, roleId: string): Promise<UserRoleDocument> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    await this.requireRole(roleId);

    try {
      return await this.userRoleModel.create({ userId, roleId });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Role is already assigned to this user');
      }
      throw error;
    }
  }

  async listRoleIds(userId: string): Promise<string[]> {
    if (!isValidObjectId(userId)) {
      return [];
    }

    const assignments = await this.userRoleModel
      .find({
        userId: { $in: [userId, new Types.ObjectId(userId)] },
      })
      .select('roleId')
      .exec();

    return assignments.map((assignment) => assignment.roleId.toString());
  }

  async listRoleIdsForUsers(
    userIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const validIds = userIds.filter((id) => isValidObjectId(id));
    const grouped = new Map<string, string[]>();
    if (validIds.length === 0) {
      return grouped;
    }

    const variants = validIds.flatMap((id) => [id, new Types.ObjectId(id)]);
    const assignments = await this.userRoleModel
      .find({ userId: { $in: variants } })
      .select('userId roleId')
      .exec();

    for (const assignment of assignments) {
      const userId = assignment.userId.toString();
      const current = grouped.get(userId) ?? [];
      current.push(assignment.roleId.toString());
      grouped.set(userId, current);
    }

    return grouped;
  }

  async countUsersByRole(): Promise<Map<string, number>> {
    const rows = await this.userRoleModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$roleId', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [String(row._id), row.count]));
  }

  async removeAllForRole(roleId: string): Promise<void> {
    if (!isValidObjectId(roleId)) {
      return;
    }

    await this.userRoleModel
      .deleteMany({
        roleId: { $in: [roleId, new Types.ObjectId(roleId)] },
      })
      .exec();
  }

  async removeAllForUser(userId: string): Promise<void> {
    if (!isValidObjectId(userId)) {
      return;
    }

    await this.userRoleModel
      .deleteMany({
        userId: { $in: [userId, new Types.ObjectId(userId)] },
      })
      .exec();
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    if (!isValidObjectId(roleId)) {
      throw new NotFoundException('Role assignment not found');
    }

    const deleted = await this.userRoleModel
      .findOneAndDelete({ userId, roleId })
      .exec();

    if (!deleted) {
      throw new NotFoundException('Role assignment not found');
    }
  }

  private async requireUser(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async requireRole(roleId: string): Promise<void> {
    if (!isValidObjectId(roleId)) {
      throw new NotFoundException('Role not found');
    }

    const role = await this.rolesService.findById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: number }).code === 11000
    );
  }
}
