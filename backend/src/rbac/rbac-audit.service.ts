import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RbacAudit, RbacAuditDocument } from './schemas/rbac-audit.schema';

export interface RbacAuditInput {
  actor: AuthenticatedUser;
  action: string;
  targetType: 'user' | 'role';
  targetId: string;
  summary: string;
}

@Injectable()
export class RbacAuditService {
  private readonly logger = new Logger(RbacAuditService.name);

  constructor(
    @InjectModel(RbacAudit.name)
    private readonly auditModel: Model<RbacAuditDocument>,
  ) {}

  async record(input: RbacAuditInput): Promise<void> {
    const summary = input.summary.trim().slice(0, 500);
    this.logger.log(
      `${input.action} actor=${input.actor.userId} target=${input.targetType}:${input.targetId} ${summary}`,
    );

    await this.auditModel.create({
      actorId: input.actor.userId,
      actorEmail: input.actor.email,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary,
    });
  }
}
