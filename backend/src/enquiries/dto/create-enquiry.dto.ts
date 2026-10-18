import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class CreateEnquiryDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2, { message: 'Please enter your name' })
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @Transform(({ value }) => trimString(value))
  @IsEmail({}, { message: 'Please enter a valid email' })
  @MaxLength(255)
  email!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(/^[+\d][\d\s-]{7,16}$/, {
    message: 'Please enter a valid phone number',
  })
  phone!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty({ message: 'Please select a requirement' })
  @MaxLength(200)
  service!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(10, {
    message: 'Please share a few details (min. 10 characters)',
  })
  @MaxLength(2000)
  message!: string;
}
