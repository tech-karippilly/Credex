import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CALL_OUTCOMES,
  DEMO_MODES,
  FOLLOW_UP_STATUSES,
  INTERESTED_MODULES,
  MANUAL_ACTIVITY_TYPES,
} from '../constants/lead.constants';
import { emptyToUndefined, trimString } from '../utils/lead-normalize.util';

export class LeadActivityPayloadDto {
  @IsOptional()
  @IsIn(CALL_OUTCOMES)
  outcome?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customerResponse?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextFollowUpAt?: string;

  @IsOptional()
  @IsIn(FOLLOW_UP_STATUSES)
  followUpStatus?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  demoAt?: string;

  @IsOptional()
  @IsIn(DEMO_MODES)
  demoMode?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(400)
  meetingLink?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(INTERESTED_MODULES, { each: true })
  modules?: string[];

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  feedback?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  demoOutcome?: string;
}

export class CreateLeadActivityDto {
  @IsIn(MANUAL_ACTIVITY_TYPES)
  type!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LeadActivityPayloadDto)
  payload?: LeadActivityPayloadDto;
}
