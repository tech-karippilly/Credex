import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';

export interface CreateRoleInput {
  name: string;
  key: string;
  description: string;
  systemManaged?: boolean;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async create(input: CreateRoleInput): Promise<RoleDocument> {
    try {
      return await this.roleModel.create({
        name: input.name.trim(),
        key: input.key.trim(),
        description: input.description.trim(),
        systemManaged: input.systemManaged ?? false,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Role key already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<RoleDocument | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.roleModel.findById(id).exec();
  }

  async findByIds(ids: readonly string[]): Promise<RoleDocument[]> {
    const valid = ids.filter((id) => isValidObjectId(id));
    if (valid.length === 0) {
      return [];
    }

    return this.roleModel.find({ _id: { $in: valid } }).exec();
  }

  async list(): Promise<RoleDocument[]> {
    return this.roleModel.find().sort({ name: 1 }).exec();
  }

  async update(
    id: string,
    input: { name: string; description: string },
  ): Promise<RoleDocument> {
    const role = await this.requireRole(id);
    role.name = input.name.trim();
    role.description = input.description.trim();
    await role.save();
    return role;
  }

  async deleteById(id: string): Promise<RoleDocument> {
    const role = await this.requireRole(id);
    await this.roleModel.deleteOne({ _id: role._id }).exec();
    return role;
  }

  private async requireRole(id: string): Promise<RoleDocument> {
    const role = await this.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
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
