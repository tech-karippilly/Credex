import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const created = await this.userModel.create({
      name: createUserDto.name.trim(),
      email,
      password: passwordHash,
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

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const updated = await this.userModel
      .findByIdAndUpdate(userId, { password: passwordHash })
      .exec();

    if (!updated) {
      throw new NotFoundException('User not found');
    }
  }
}
