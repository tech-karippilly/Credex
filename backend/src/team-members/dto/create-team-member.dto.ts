import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TEAM_MEMBER_BIO_MAX_LENGTH } from '../constants/team-member.constants';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateTeamMemberDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  designation!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  department!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  positionInCompany!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MaxLength(TEAM_MEMBER_BIO_MAX_LENGTH)
  bio?: string;

  @IsInt()
  @Min(1)
  order!: number;
}
