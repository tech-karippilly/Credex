import { IsMongoId, IsOptional } from 'class-validator';

export class ListApplicationsQueryDto {
  @IsOptional()
  @IsMongoId()
  careerId?: string;
}
