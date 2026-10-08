import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { addDurationToNow } from '../common/utils/duration.util';
import { hashToken } from '../common/utils/token-hash.util';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  async createResetToken(
    userId: string,
    rawToken: string,
    expiresIn: string,
  ): Promise<void> {
    await this.passwordResetTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hashToken(rawToken),
      expiresAt: addDurationToNow(expiresIn),
      usedAt: null,
    });
  }

  async findValidToken(
    rawToken: string,
  ): Promise<PasswordResetTokenDocument | null> {
    const tokenHash = hashToken(rawToken);
    return this.passwordResetTokenModel
      .findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async markTokenAsUsed(tokenId: string): Promise<void> {
    await this.passwordResetTokenModel
      .findByIdAndUpdate(tokenId, { usedAt: new Date() })
      .exec();
  }
}
