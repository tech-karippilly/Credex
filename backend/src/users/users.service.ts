import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { ADMIN_DISPLAY_NAME } from '../auth/constants/auth.constants';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service';
import { SUPER_ADMIN_PROTECTED_MESSAGE } from './constants/user.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { User, UserDocument } from './schemas/user.schema';
import { isUserSuperAdmin } from './utils/user-account.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly authSessionsService: AuthSessionsService,
  ) {}

  toResponse(user: UserDocument | User): UserResponse {
    const document = user as UserDocument;
    const id = document._id ? document._id.toString() : '';

    return {
      id,
      name: document.name,
      email: document.email,
    };
  }

  async create(
    createUserDto: CreateUserDto,
    passwordHash: string,
  ): Promise<UserResponse> {
    const email = createUserDto.email.toLowerCase().trim();
    if (this.isReservedAdminEmail(email)) {
      throw new ConflictException('Email already exists');
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const created = await this.userModel.create({
      name: createUserDto.name.trim(),
      email,
      password: passwordHash,
      isActive: true,
      isSuperAdmin: false,
      authVersion: 0,
    });

    return this.toResponse(created);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async list(query: UserQueryDto): Promise<{
    users: UserDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter: Record<string, unknown> = {};

    if (query.status === 'active') {
      filter.isActive = { $ne: false };
    } else if (query.status === 'inactive') {
      filter.isActive = false;
    }

    const search = query.search?.trim();
    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1, email: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { users, page, limit, total };
  }

  async updateManagedUser(
    userId: string,
    input: { name?: string; email?: string; passwordHash?: string },
  ): Promise<UserDocument> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    const updates: { name?: string; email?: string; password?: string } = {};
    if (input.name !== undefined) {
      updates.name = input.name.trim();
    }

    let emailChanged = false;
    if (input.email !== undefined) {
      const email = input.email.toLowerCase().trim();
      if (email !== user.email) {
        if (this.isReservedAdminEmail(email)) {
          throw new ConflictException('Email already exists');
        }
        const existing = await this.findByEmail(email);
        if (existing && existing._id.toString() !== user._id.toString()) {
          throw new ConflictException('Email already exists');
        }
        updates.email = email;
        emailChanged = true;
      }
    }

    if (input.passwordHash) {
      updates.password = input.passwordHash;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No user changes were provided');
    }

    await this.userModel.updateOne({ _id: user._id }, { $set: updates }).exec();

    if (emailChanged || input.passwordHash) {
      await this.incrementAuthVersion(userId);
    }

    return this.requireUser(userId);
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.userModel.findById(id).exec();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const existing = await this.requireUser(userId);
    if (isUserSuperAdmin(existing)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { password: passwordHash })
      .exec();

    if (!updated) {
      throw new NotFoundException('User not found');
    }
  }

  async backfillDefaults(): Promise<void> {
    await this.userModel
      .updateMany(
        { isActive: { $exists: false } },
        { $set: { isActive: true } },
      )
      .exec();
    await this.userModel
      .updateMany(
        { isSuperAdmin: { $exists: false } },
        { $set: { isSuperAdmin: false } },
      )
      .exec();
    await this.userModel
      .updateMany(
        { authVersion: { $exists: false } },
        { $set: { authVersion: 0 } },
      )
      .exec();
  }

  async createProtectedSuperAdmin(
    email: string,
    passwordHash: string,
  ): Promise<UserDocument> {
    return this.userModel.create({
      name: ADMIN_DISPLAY_NAME,
      email: email.toLowerCase().trim(),
      password: passwordHash,
      isActive: true,
      isSuperAdmin: true,
      authVersion: 0,
    });
  }

  async protectSuperAdminFlags(userId: string): Promise<boolean> {
    const user = await this.requireUser(userId);
    const updates: { isSuperAdmin?: boolean; isActive?: boolean } = {};

    if (!isUserSuperAdmin(user)) {
      updates.isSuperAdmin = true;
    }
    if (user.isActive !== true) {
      updates.isActive = true;
    }

    if (Object.keys(updates).length === 0) {
      return false;
    }

    await this.userModel.updateOne({ _id: user._id }, { $set: updates }).exec();
    return true;
  }

  async setActiveStatus(userId: string, isActive: boolean): Promise<void> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      if (!isActive) {
        throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
      }
      return;
    }

    if (isActive) {
      await this.userModel
        .updateOne({ _id: user._id }, { $set: { isActive: true } })
        .exec();
      return;
    }

    await this.userModel
      .updateOne(
        { _id: user._id },
        { $set: { isActive: false }, $inc: { authVersion: 1 } },
      )
      .exec();
    await this.authSessionsService.revokeAllForUser(userId);
  }

  async deleteById(userId: string): Promise<void> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    await this.userModel.deleteOne({ _id: user._id }).exec();
    await this.authSessionsService.revokeAllForUser(userId);
  }

  async incrementAuthVersion(userId: string): Promise<number> {
    const user = await this.requireUser(userId);
    if (isUserSuperAdmin(user)) {
      throw new ForbiddenException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(user._id, { $inc: { authVersion: 1 } }, { new: true })
      .exec();

    await this.authSessionsService.revokeAllForUser(userId);
    return typeof updated?.authVersion === 'number' ? updated.authVersion : 0;
  }

  isReservedAdminEmail(email: string): boolean {
    return (
      email.toLowerCase().trim() ===
      this.configService.getOrThrow<string>('admin.email').toLowerCase().trim()
    );
  }

  private async requireUser(userId: string): Promise<UserDocument> {
    if (!isValidObjectId(userId)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
