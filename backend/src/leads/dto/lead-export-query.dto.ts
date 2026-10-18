import { IsIn, IsOptional } from 'class-validator';
import { LeadQueryDto } from './lead-query.dto';

export class LeadExportQueryDto extends LeadQueryDto {
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: 'xlsx' | 'csv' = 'xlsx';
}
