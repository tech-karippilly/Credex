import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { IsTwoDecimalAmount } from '../../expenses/dto/is-two-decimal-amount';
import {
  DEFAULT_LEAD_PRIORITY,
  DEFAULT_LEAD_STAGE,
  INTEREST_TYPES,
  INTERESTED_MODULES,
  LEAD_PHONE_REGEX,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from '../constants/lead.constants';
import { emptyToUndefined, trimString } from '../utils/lead-normalize.util';

export class CreateLeadDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  companyName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(LEAD_PHONE_REGEX, { message: 'Please enter a valid phone number' })
  phone!: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @Matches(LEAD_PHONE_REGEX, {
    message: 'Please enter a valid alternate phone number',
  })
  alternatePhone?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  location?: string;

  @IsIn(LEAD_SOURCES)
  source!: string;

  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: string = DEFAULT_LEAD_STAGE;

  @IsOptional()
  @IsIn(LEAD_PRIORITIES)
  priority?: string = DEFAULT_LEAD_PRIORITY;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsMongoId()
  assignedUserId?: string;

  @IsOptional()
  @IsIn(INTEREST_TYPES)
  interestType?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(INTERESTED_MODULES, { each: true })
  interestedModules?: string[];

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  requestedFeatures?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  changeRequests?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  businessRequirements?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsTwoDecimalAmount()
  estimatedBudget?: number;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  expectedTimeline?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  decisionMaker?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextFollowUpAt?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nextAction?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}
