import { Types } from 'mongoose';
import {
  TERMINAL_LEAD_STAGES,
  type FollowUpFilter,
} from '../constants/lead.constants';
import { LeadQueryDto } from '../dto/lead-query.dto';
import { assertDateOrder, parseLeadDate, utcDayRange } from './lead-dates.util';
import { containsRegex } from './lead-normalize.util';

export function activeLeadFilter(): Record<string, unknown> {
  return { deletedAt: null };
}

export function followUpDateFilter(
  kind: FollowUpFilter,
  now = new Date(),
): Record<string, unknown> {
  const { start, end } = utcDayRange(now);
  const openStages = { stage: { $nin: [...TERMINAL_LEAD_STAGES] } };

  if (kind === 'today') {
    return {
      ...openStages,
      nextFollowUpAt: { $gte: start, $lte: end },
    };
  }
  if (kind === 'overdue') {
    return {
      ...openStages,
      nextFollowUpAt: { $ne: null, $lt: start },
    };
  }
  return {
    ...openStages,
    nextFollowUpAt: { $gt: end },
  };
}

export function buildLeadFilter(
  query: LeadQueryDto,
  now = new Date(),
): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...activeLeadFilter() };

  if (query.stage) {
    filter.stage = query.stage;
  }
  if (query.source) {
    filter.source = query.source;
  }
  if (query.priority) {
    filter.priority = query.priority;
  }
  if (query.assignedUserId) {
    filter.assignedUserId = new Types.ObjectId(query.assignedUserId);
  }

  const search = query.search?.trim();
  if (search) {
    const regex = containsRegex(search);
    filter.$or = [
      { companyName: regex },
      { contactName: regex },
      { phone: regex },
      { email: regex },
      { normalizedPhone: regex },
      { normalizedEmail: regex },
      { location: regex },
    ];
  }

  assertDateOrder(query.from, query.to);
  if (query.from || query.to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (query.from) {
      createdAt.$gte = parseLeadDate(query.from, 'from date');
    }
    if (query.to) {
      const end = parseLeadDate(query.to, 'to date');
      end.setUTCHours(23, 59, 59, 999);
      createdAt.$lte = end;
    }
    filter.createdAt = createdAt;
  }

  if (query.followUp) {
    Object.assign(filter, followUpDateFilter(query.followUp as FollowUpFilter, now));
  }

  return filter;
}

export function leadSort(query: LeadQueryDto): Record<string, 1 | -1> {
  const direction: 1 | -1 = query.order === 'asc' ? 1 : -1;
  const field = query.sort === 'nextFollowUpAt' ? 'nextFollowUpAt' : 'createdAt';
  return { [field]: direction, _id: direction };
}
