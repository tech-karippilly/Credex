import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  EMPLOYEE_ADDRESS_MAX_LENGTH,
  EMPLOYMENT_TYPES,
  type EmploymentType,
} from '../constants/employee.constants';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function lowerEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function blankToNull(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function compactAccountNumber(value: unknown): unknown {
  return typeof value === 'string' ? value.replace(/\s/g, '') : value;
}

function compactIfsc(value: unknown): unknown {
  return typeof value === 'string'
    ? value.replace(/\s/g, '').toUpperCase()
    : value;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) => lowerEmail(value))
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @Matches(/^[0-9+\-() ]{7,20}$/, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsOptional()
  @Transform(({ value }) => blankToNull(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateOfBirth?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(EMPLOYEE_ADDRESS_MAX_LENGTH)
  address?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  designation?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  workLocation?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: EmploymentType;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  joiningDate?: string;

  @IsOptional()
  @Transform(({ value }) => blankToNull(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsMongoId()
  reportingManagerId?: string | null;

  @IsOptional()
  @Transform(({ value }) => blankToNull(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/, {
    message: 'eSSL user id must be letters, numbers, _ or -',
  })
  deviceUserId?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @IsOptional()
  @Transform(({ value }) => compactIfsc(value))
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'IFSC must be 11 characters, like HDFC0001234',
  })
  ifsc?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(120)
  bankAccountName?: string;

  @IsOptional()
  @Transform(({ value }) => compactAccountNumber(value))
  @ValidateIf((_, value) => typeof value === 'string' && value.length > 0)
  @Matches(/^\d{9,18}$/, {
    message: 'Bank account number must be 9 to 18 digits',
  })
  bankAccountNumber?: string;
}
