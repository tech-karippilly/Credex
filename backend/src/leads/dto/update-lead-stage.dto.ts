import { IsIn } from 'class-validator';
import { LEAD_STAGES } from '../constants/lead.constants';

export class UpdateLeadStageDto {
  @IsIn(LEAD_STAGES)
  stage!: string;
}
