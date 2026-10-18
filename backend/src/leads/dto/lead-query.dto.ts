import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FOLLOW_UP_FILTERS,
  LEAD_PRIORITIES,
  LEAD_SORT_FIELDS,
  LEAD_SOURCES,
  LEAD_STAGES,
} from '../constants/lead.constants';
import { emptyToUndefined } from '../utils/lead-normalize.util';

export class LeadQueryDto {
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsIn(LEAD_STAGES)
  stage?: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsMongoId()
  assignedUserId?: string;

  @IsOptional()
  @IsIn(LEAD_SOURCES)
  source?: string;

  @IsOptional()
  @IsIn(LEAD_PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsIn(FOLLOW_UP_FILTERS)
  followUp?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsIn(LEAD_SORT_FIELDS)
  sort?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
