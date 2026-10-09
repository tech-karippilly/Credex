import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SendVoucherWhatsappDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').trim() : value,
  )
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164 number (e.g. +919876543210)',
  })
  phone!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
