import { IsIn } from 'class-validator';
import { TEAM_MEMBER_STATUSES } from '../constants/team-member.constants';

export class UpdateTeamMemberStatusDto {
  @IsIn(TEAM_MEMBER_STATUSES)
  status!: (typeof TEAM_MEMBER_STATUSES)[number];
}
