import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { normalizeStringArray } from './normalize-string-array';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdateCareerDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  location?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  employmentType?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  experience?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  workplace?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  salary?: string;

  @Transform(({ value }) => normalizeStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @Transform(({ value }) => normalizeStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @Transform(({ value }) => normalizeStringArray(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goodToHave?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}
