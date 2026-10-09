import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SiteContactImageDto {
  @IsString()
  url!: string;

  @IsString()
  publicId!: string;
}

class SiteContactContactDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  instagramUrl?: string;
}

class SiteContactHomepageDto {
  @IsOptional()
  @IsString()
  mainHeadline?: string;

  @IsOptional()
  @IsString()
  supportingText?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactImageDto)
  homepageMainImage?: SiteContactImageDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactImageDto)
  aboutSectionImage?: SiteContactImageDto | null;
}

export class UpdateSiteContactDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactContactDto)
  contact?: SiteContactContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactHomepageDto)
  homepage?: SiteContactHomepageDto;
}
