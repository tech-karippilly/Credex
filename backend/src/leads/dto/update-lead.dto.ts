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
  ValidateIf,
} from 'class-validator';
import { IsTwoDecimalAmount } from '../../expenses/dto/is-two-decimal-amount';
import {
  INTEREST_TYPES,
  INTERESTED_MODULES,
  LEAD_PHONE_REGEX,
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from '../constants/lead.constants';
import { emptyToUndefined, trimString } from '../utils/lead-normalize.util';

export class UpdateLeadDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  companyName?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contactName?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @Matches(LEAD_PHONE_REGEX, { message: 'Please enter a valid phone number' })
  phone?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(LEAD_PHONE_REGEX, {
    message: 'Please enter a valid alternate phone number',
  })
  alternatePhone?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(300)
  website?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  location?: string | null;

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;

  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: string;

  @IsOptional()
  @IsIn(LEAD_PRIORITIES)
  priority?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsMongoId()
  assignedUserId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(INTEREST_TYPES)
  interestType?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(INTERESTED_MODULES, { each: true })
  interestedModules?: string[];

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(4000)
  requestedFeatures?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(4000)
  changeRequests?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(4000)
  businessRequirements?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsTwoDecimalAmount()
  estimatedBudget?: number | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  expectedTimeline?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(160)
  decisionMaker?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  nextFollowUpAt?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  nextAction?: string | null;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}
