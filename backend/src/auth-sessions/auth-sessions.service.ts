import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashToken } from '../common/utils/token-hash.util';
import {
  AuthSession,
  AuthSessionDocument,
} from './schemas/auth-session.schema';

@Injectable()
export class AuthSessionsService {
  constructor(
    @InjectModel(AuthSession.name)
    private readonly authSessionModel: Model<AuthSessionDocument>,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.authSessionModel.create({
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    });
  }

  async findValidSession(
    userId: string,
    refreshToken: string,
  ): Promise<AuthSessionDocument | null> {
    const tokenHash = hashToken(refreshToken);
    return this.authSessionModel
      .findOne({
        userId,
        tokenHash,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.authSessionModel.findByIdAndDelete(sessionId).exec();
  }

  async revokeByRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.authSessionModel
      .deleteOne({
        userId,
        tokenHash,
      })
      .exec();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.authSessionModel.deleteMany({ userId }).exec();
  }
}
