import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { isUserActive } from '../users/utils/user-account.util';
import { UsersService } from '../users/users.service';
import {
  DEFAULT_LEAD_PRIORITY,
  DEFAULT_LEAD_STAGE,
  LEAD_STAGES,
  type LeadActivityType,
} from './constants/lead.constants';
import { CreateLeadActivityDto } from './dto/create-lead-activity.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadActivityQueryDto } from './dto/lead-activity-query.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import {
  LeadActivityListResult,
  LeadActivityResponse,
  LeadAssigneeResponse,
  LeadListResult,
  LeadResponse,
  LeadSummaryResponse,
} from './interfaces/lead-response.interface';
import {
  LeadActivity,
  LeadActivityDocument,
} from './schemas/lead-activity.schema';
import { Lead, LeadDocument } from './schemas/lead.schema';
import { formatLeadDate, parseLeadDate } from './utils/lead-dates.util';
import {
  activeLeadFilter,
  buildLeadFilter,
  followUpDateFilter,
  leadSort,
} from './utils/lead-filter.util';
import {
  isDuplicateKeyError,
  normalizeEmail,
  normalizePhone,
} from './utils/lead-normalize.util';

type AssigneeSnapshot = {
  assignedUserId: Types.ObjectId | null;
  assignedUserName: string | null;
  assignedUserEmail: string | null;
};

@Injectable()
export class LeadsService {
  constructor(
    @InjectModel(Lead.name) private readonly leadModel: Model<LeadDocument>,
    @InjectModel(LeadActivity.name)
    private readonly activityModel: Model<LeadActivityDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateLeadDto,
    actor: AuthenticatedUser,
  ): Promise<LeadResponse> {
    const assignee = await this.resolveAssignee(dto.assignedUserId);
    const phone = dto.phone.trim();
    const normalizedPhone = normalizePhone(phone);
    const email = dto.email?.trim() ?? null;
    const normalizedEmail = email ? normalizeEmail(email) : null;

    await this.assertNoDuplicate(normalizedPhone, normalizedEmail);

    try {
      const created = await this.leadModel.create({
        ...this.contactFields(dto, phone, normalizedPhone, email, normalizedEmail),
        source: dto.source,
        stage: dto.stage ?? DEFAULT_LEAD_STAGE,
        priority: dto.priority ?? DEFAULT_LEAD_PRIORITY,
        ...assignee,
        ...this.interestFields(dto),
        nextFollowUpAt: dto.nextFollowUpAt
          ? parseLeadDate(dto.nextFollowUpAt, 'next follow-up date')
          : null,
        nextAction: dto.nextAction ?? null,
        notes: dto.notes ?? null,
        sourceEnquiryId: null,
        createdByUserId: actor.userId,
        updatedByUserId: actor.userId,
        deletedAt: null,
      });

      await this.recordActivity(created, actor, 'CREATED', 'Lead created');
      if (assignee.assignedUserId) {
        await this.recordActivity(
          created,
          actor,
          'ASSIGNED',
          `Assigned to ${assignee.assignedUserName}`,
          {
            previous: '',
            next: assignee.assignedUserEmail ?? '',
          },
        );
      }
      return this.toResponse(created);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A lead with this phone number or email already exists',
        );
      }
      throw error;
    }
  }

  async findAll(query: LeadQueryDto): Promise<LeadListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = buildLeadFilter(query);
    const [items, total] = await Promise.all([
      this.leadModel
        .find(filter)
        .sort(leadSort(query))
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.leadModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async summary(
    actor: AuthenticatedUser,
    now = new Date(),
  ): Promise<LeadSummaryResponse> {
    const base = activeLeadFilter();
    const today = followUpDateFilter('today', now);
    const overdue = followUpDateFilter('overdue', now);
    const upcoming = followUpDateFilter('upcoming', now);
    const mineId = await this.resolveActorUserObjectId(actor);

    const [stageRows, followUpsDueToday, overdueFollowUps, upcomingFollowUps, assignedToMe] =
      await Promise.all([
        this.leadModel
          .aggregate<{ _id: string; count: number }>([
            { $match: base },
            { $group: { _id: '$stage', count: { $sum: 1 } } },
          ])
          .exec(),
        this.leadModel.countDocuments({ ...base, ...today }).exec(),
        this.leadModel.countDocuments({ ...base, ...overdue }).exec(),
        this.leadModel.countDocuments({ ...base, ...upcoming }).exec(),
        mineId
          ? this.leadModel
              .countDocuments({ ...base, assignedUserId: mineId })
              .exec()
          : Promise.resolve(0),
      ]);

    const byStage = LEAD_STAGES.map((stage) => ({
      stage,
      count: stageRows.find((row) => row._id === stage)?.count ?? 0,
    }));
    const countFor = (stage: string) =>
      byStage.find((row) => row.stage === stage)?.count ?? 0;
    const total = byStage.reduce((sum, row) => sum + row.count, 0);

    return {
      total,
      new: countFor('NEW'),
      contacted: countFor('CONTACTED'),
      qualified: countFor('QUALIFIED'),
      demoScheduled: countFor('DEMO_SCHEDULED'),
      demoCompleted: countFor('DEMO_COMPLETED'),
      proposal: countFor('PROPOSAL'),
      won: countFor('WON'),
      lost: countFor('LOST'),
      onHold: countFor('ON_HOLD'),
      followUpsDueToday,
      overdueFollowUps,
      upcomingFollowUps,
      assignedToMe,
      byStage,
    };
  }

  async listAssignees(): Promise<LeadAssigneeResponse[]> {
    const items: LeadAssigneeResponse[] = [];
    let page = 1;
    while (page <= 5) {
      const result = await this.usersService.list({
        status: 'active',
        page,
        limit: 100,
      });
      for (const user of result.users) {
        items.push({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        });
      }
      if (result.users.length < 100 || items.length >= result.total) {
        break;
      }
      page += 1;
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(id: string): Promise<LeadResponse> {
    return this.toResponse(await this.requireLead(id));
  }

  async update(
    id: string,
    dto: UpdateLeadDto,
    actor: AuthenticatedUser,
  ): Promise<LeadResponse> {
    const lead = await this.requireLead(id);
    const previousStage = lead.stage;
    const previousAssignee = lead.assignedUserEmail ?? '';
    const changes: { field: string; previous: string; next: string }[] = [];

    if (dto.companyName !== undefined) {
      this.pushChange(changes, 'companyName', lead.companyName, dto.companyName);
      lead.companyName = dto.companyName;
    }
    if (dto.contactName !== undefined) {
      this.pushChange(changes, 'contactName', lead.contactName, dto.contactName);
      lead.contactName = dto.contactName;
    }
    if (dto.phone !== undefined) {
      this.pushChange(changes, 'phone', lead.phone, dto.phone);
      lead.phone = dto.phone.trim();
      lead.normalizedPhone = normalizePhone(lead.phone);
    }
    if (dto.alternatePhone !== undefined) {
      const next = dto.alternatePhone?.trim() || null;
      this.pushChange(changes, 'alternatePhone', lead.alternatePhone ?? '', next ?? '');
      lead.alternatePhone = next;
    }
    if (dto.email !== undefined) {
      const next = dto.email?.trim() || null;
      this.pushChange(changes, 'email', lead.email ?? '', next ?? '');
      lead.email = next;
      lead.normalizedEmail = next ? normalizeEmail(next) : null;
    }
    if (dto.website !== undefined) {
      lead.website = dto.website?.trim() || null;
      this.pushChange(changes, 'website', '', lead.website ?? '');
    }
    if (dto.location !== undefined) {
      this.pushChange(changes, 'location', lead.location ?? '', dto.location ?? '');
      lead.location = dto.location?.trim() || null;
    }
    if (dto.source !== undefined) {
      this.pushChange(changes, 'source', lead.source, dto.source);
      lead.source = dto.source;
    }
    if (dto.priority !== undefined) {
      this.pushChange(changes, 'priority', lead.priority, dto.priority);
      lead.priority = dto.priority;
    }
    if (dto.interestType !== undefined) {
      lead.interestType = dto.interestType;
    }
    if (dto.interestedModules !== undefined) {
      lead.interestedModules = dto.interestedModules;
    }
    if (dto.requestedFeatures !== undefined) {
      lead.requestedFeatures = dto.requestedFeatures?.trim() || null;
    }
    if (dto.changeRequests !== undefined) {
      lead.changeRequests = dto.changeRequests?.trim() || null;
    }
    if (dto.businessRequirements !== undefined) {
      lead.businessRequirements = dto.businessRequirements?.trim() || null;
    }
    if (dto.estimatedBudget !== undefined) {
      lead.estimatedBudget = dto.estimatedBudget;
    }
    if (dto.expectedTimeline !== undefined) {
      lead.expectedTimeline = dto.expectedTimeline?.trim() || null;
    }
    if (dto.decisionMaker !== undefined) {
      lead.decisionMaker = dto.decisionMaker?.trim() || null;
    }
    if (dto.nextFollowUpAt !== undefined) {
      const nextDate = dto.nextFollowUpAt
        ? parseLeadDate(dto.nextFollowUpAt, 'next follow-up date')
        : null;
      this.pushChange(
        changes,
        'nextFollowUpAt',
        formatLeadDate(lead.nextFollowUpAt) ?? '',
        formatLeadDate(nextDate) ?? '',
      );
      lead.nextFollowUpAt = nextDate;
    }
    if (dto.nextAction !== undefined) {
      this.pushChange(changes, 'nextAction', lead.nextAction ?? '', dto.nextAction ?? '');
      lead.nextAction = dto.nextAction?.trim() || null;
    }
    if (dto.notes !== undefined) {
      lead.notes = dto.notes?.trim() || null;
    }

    if (dto.assignedUserId !== undefined) {
      const assignee = await this.resolveAssignee(dto.assignedUserId);
      lead.assignedUserId = assignee.assignedUserId;
      lead.assignedUserName = assignee.assignedUserName;
      lead.assignedUserEmail = assignee.assignedUserEmail;
    }

    if (dto.stage !== undefined) {
      lead.stage = dto.stage;
    }

    await this.assertNoDuplicate(
      lead.normalizedPhone,
      lead.normalizedEmail,
      lead._id.toString(),
    );

    lead.updatedByUserId = actor.userId;

    try {
      await lead.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'A lead with this phone number or email already exists',
        );
      }
      throw error;
    }

    if (dto.stage !== undefined && dto.stage !== previousStage) {
      await this.recordActivity(
        lead,
        actor,
        'STATUS_CHANGED',
        `Stage changed from ${previousStage} to ${dto.stage}`,
        { previous: previousStage, next: dto.stage },
      );
    }
    if (dto.assignedUserId !== undefined) {
      const nextAssignee = lead.assignedUserEmail ?? '';
      if (nextAssignee !== previousAssignee) {
        await this.recordActivity(
          lead,
          actor,
          'ASSIGNED',
          nextAssignee
            ? `Assigned to ${lead.assignedUserName}`
            : 'Assignment cleared',
          { previous: previousAssignee, next: nextAssignee },
        );
      }
    }
    const detailChanges = changes.filter(
      (change) => change.field !== 'stage' && change.previous !== change.next,
    );
    if (detailChanges.length > 0) {
      await this.recordActivity(lead, actor, 'UPDATED', 'Lead details updated', {
        changes: detailChanges,
      });
    }

    return this.toResponse(lead);
  }

  async updateStage(
    id: string,
    stage: string,
    actor: AuthenticatedUser,
  ): Promise<LeadResponse> {
    return this.update(id, { stage }, actor);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const lead = await this.requireLead(id);
    lead.deletedAt = new Date();
    lead.updatedByUserId = actor.userId;
    await lead.save();
  }

  async listActivities(
    id: string,
    query: LeadActivityQueryDto,
  ): Promise<LeadActivityListResult> {
    const lead = await this.requireLead(id);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { leadId: lead._id };
    const [items, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toActivityResponse(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async addActivity(
    id: string,
    dto: CreateLeadActivityDto,
    actor: AuthenticatedUser,
  ): Promise<LeadActivityResponse> {
    const lead = await this.requireLead(id);
    const payload = dto.payload ?? {};
    const summary = dto.summary?.trim() || this.defaultActivitySummary(dto.type, payload);

    if (payload.nextFollowUpAt) {
      lead.nextFollowUpAt = parseLeadDate(
        payload.nextFollowUpAt,
        'next follow-up date',
      );
    } else if (
      dto.type === 'FOLLOW_UP' &&
      payload.followUpStatus &&
      payload.followUpStatus !== 'PENDING'
    ) {
      lead.nextFollowUpAt = null;
    }
    if (payload.nextAction !== undefined) {
      lead.nextAction = payload.nextAction;
    }
    if (dto.type === 'DEMO_SCHEDULED' && this.canAdvanceTo(lead.stage, 'DEMO_SCHEDULED')) {
      const previous = lead.stage;
      lead.stage = 'DEMO_SCHEDULED';
      if (previous !== lead.stage) {
        await this.recordActivity(
          lead,
          actor,
          'STATUS_CHANGED',
          `Stage changed from ${previous} to ${lead.stage}`,
          { previous, next: lead.stage },
        );
      }
    }
    if (dto.type === 'DEMO_COMPLETED' && this.canAdvanceTo(lead.stage, 'DEMO_COMPLETED')) {
      const previous = lead.stage;
      lead.stage = 'DEMO_COMPLETED';
      if (previous !== lead.stage) {
        await this.recordActivity(
          lead,
          actor,
          'STATUS_CHANGED',
          `Stage changed from ${previous} to ${lead.stage}`,
          { previous, next: lead.stage },
        );
      }
    }

    lead.updatedByUserId = actor.userId;
    await lead.save();

    const activity = await this.recordActivity(
      lead,
      actor,
      dto.type as LeadActivityType,
      summary,
      payload as Record<string, unknown>,
    );
    return this.toActivityResponse(activity);
  }

  async recordActivity(
    lead: LeadDocument,
    actor: AuthenticatedUser,
    type: LeadActivityType,
    summary: string,
    payload: Record<string, unknown> | null = null,
  ): Promise<LeadActivityDocument> {
    const [activity] = await this.activityModel.create([
      {
        leadId: lead._id,
        type,
        actorId: actor.userId,
        actorEmail: actor.email,
        actorName: actor.name,
        summary,
        payload,
      },
    ]);
    lead.lastActivityAt = activity.createdAt ?? new Date();
    lead.lastActivitySummary = summary;
    lead.lastActivityType = type;
    await lead.save();
    return activity;
  }

  async requireLead(id: string): Promise<LeadDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Lead not found');
    }
    const lead = await this.leadModel
      .findOne({ _id: id, deletedAt: null })
      .exec();
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  toResponse(lead: LeadDocument): LeadResponse {
    return {
      id: lead._id.toString(),
      companyName: lead.companyName,
      contactName: lead.contactName,
      phone: lead.phone,
      alternatePhone: lead.alternatePhone,
      email: lead.email,
      website: lead.website,
      location: lead.location,
      source: lead.source,
      stage: lead.stage,
      priority: lead.priority,
      assignedUserId: lead.assignedUserId ? lead.assignedUserId.toString() : null,
      assignedUserName: lead.assignedUserName,
      assignedUserEmail: lead.assignedUserEmail,
      interestType: lead.interestType,
      interestedModules: lead.interestedModules ?? [],
      requestedFeatures: lead.requestedFeatures,
      changeRequests: lead.changeRequests,
      businessRequirements: lead.businessRequirements,
      estimatedBudget: lead.estimatedBudget,
      expectedTimeline: lead.expectedTimeline,
      decisionMaker: lead.decisionMaker,
      nextFollowUpAt: formatLeadDate(lead.nextFollowUpAt),
      nextAction: lead.nextAction,
      notes: lead.notes,
      sourceEnquiryId: lead.sourceEnquiryId
        ? lead.sourceEnquiryId.toString()
        : null,
      lastActivityAt: lead.lastActivityAt
        ? new Date(lead.lastActivityAt).toISOString()
        : null,
      lastActivitySummary: lead.lastActivitySummary,
      lastActivityType: lead.lastActivityType,
      createdByUserId: lead.createdByUserId,
      updatedByUserId: lead.updatedByUserId,
      createdAt: new Date(lead.createdAt ?? Date.now()).toISOString(),
      updatedAt: new Date(lead.updatedAt ?? Date.now()).toISOString(),
    };
  }

  private toActivityResponse(activity: LeadActivityDocument): LeadActivityResponse {
    return {
      id: activity._id.toString(),
      leadId: activity.leadId.toString(),
      type: activity.type,
      actorId: activity.actorId,
      actorEmail: activity.actorEmail,
      actorName: activity.actorName,
      summary: activity.summary,
      payload: activity.payload,
      createdAt: new Date(activity.createdAt ?? Date.now()).toISOString(),
    };
  }

  async resolveAssignee(userId?: string | null): Promise<AssigneeSnapshot> {
    if (userId === undefined) {
      return {
        assignedUserId: null,
        assignedUserName: null,
        assignedUserEmail: null,
      };
    }
    if (userId === null || userId === '') {
      return {
        assignedUserId: null,
        assignedUserName: null,
        assignedUserEmail: null,
      };
    }
    const user = await this.usersService.findById(userId);
    if (!user || !isUserActive(user)) {
      throw new BadRequestException('Assigned user must be an active login account');
    }
    return {
      assignedUserId: user._id,
      assignedUserName: user.name,
      assignedUserEmail: user.email,
    };
  }

  async findDuplicate(
    normalizedPhone: string,
    normalizedEmail: string | null,
    excludeId?: string,
  ): Promise<LeadDocument | null> {
    const clauses: Record<string, unknown>[] = [{ normalizedPhone }];
    if (normalizedEmail) {
      clauses.push({ normalizedEmail });
    }
    const filter: Record<string, unknown> = {
      deletedAt: null,
      $or: clauses,
    };
    if (excludeId && isValidObjectId(excludeId)) {
      filter._id = { $ne: new Types.ObjectId(excludeId) };
    }
    return this.leadModel.findOne(filter).exec();
  }

  private async assertNoDuplicate(
    normalizedPhone: string,
    normalizedEmail: string | null,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.findDuplicate(
      normalizedPhone,
      normalizedEmail,
      excludeId,
    );
    if (existing) {
      throw new ConflictException(
        'A lead with this phone number or email already exists',
      );
    }
  }

  private async resolveActorUserObjectId(
    actor: AuthenticatedUser,
  ): Promise<Types.ObjectId | null> {
    if (isValidObjectId(actor.userId)) {
      return new Types.ObjectId(actor.userId);
    }
    const user = await this.usersService.findByEmail(actor.email);
    return user ? user._id : null;
  }

  private contactFields(
    dto: CreateLeadDto,
    phone: string,
    normalizedPhone: string,
    email: string | null,
    normalizedEmail: string | null,
  ) {
    return {
      companyName: dto.companyName,
      contactName: dto.contactName,
      phone,
      normalizedPhone,
      alternatePhone: dto.alternatePhone ?? null,
      email,
      normalizedEmail,
      website: dto.website ?? null,
      location: dto.location ?? null,
    };
  }

  private interestFields(dto: CreateLeadDto | UpdateLeadDto) {
    return {
      interestType: dto.interestType ?? null,
      interestedModules: dto.interestedModules ?? [],
      requestedFeatures: dto.requestedFeatures ?? null,
      changeRequests: dto.changeRequests ?? null,
      businessRequirements: dto.businessRequirements ?? null,
      estimatedBudget: dto.estimatedBudget ?? null,
      expectedTimeline: dto.expectedTimeline ?? null,
      decisionMaker: dto.decisionMaker ?? null,
    };
  }

  private pushChange(
    changes: { field: string; previous: string; next: string }[],
    field: string,
    previous: string,
    next: string,
  ): void {
    if (previous === next) {
      return;
    }
    changes.push({ field, previous, next });
  }

  private defaultActivitySummary(
    type: string,
    payload: CreateLeadActivityDto['payload'],
  ): string {
    if (type === 'CALL') {
      return payload?.outcome ? `Call: ${payload.outcome}` : 'Call logged';
    }
    if (type === 'FOLLOW_UP') {
      return payload?.followUpStatus
        ? `Follow-up ${payload.followUpStatus.toLowerCase()}`
        : 'Follow-up recorded';
    }
    if (type === 'DEMO_SCHEDULED') {
      return payload?.demoAt ? `Demo scheduled for ${payload.demoAt}` : 'Demo scheduled';
    }
    if (type === 'DEMO_COMPLETED') {
      return payload?.demoOutcome
        ? `Demo completed: ${payload.demoOutcome}`
        : 'Demo completed';
    }
    return 'Note added';
  }

  private canAdvanceTo(current: string, next: string): boolean {
    const currentIndex = LEAD_STAGES.indexOf(current as (typeof LEAD_STAGES)[number]);
    const nextIndex = LEAD_STAGES.indexOf(next as (typeof LEAD_STAGES)[number]);
    if (currentIndex < 0 || nextIndex < 0) {
      return false;
    }
    if (current === 'WON' || current === 'LOST' || current === 'ON_HOLD') {
      return false;
    }
    return nextIndex >= currentIndex;
  }
}
