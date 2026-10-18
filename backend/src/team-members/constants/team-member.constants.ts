export const TEAM_MEMBER_STATUSES = ['draft', 'published', 'inactive'] as const;

export type TeamMemberStatus = (typeof TEAM_MEMBER_STATUSES)[number];

export const TEAM_MEMBER_PHOTO_FOLDER = 'credex/team-members';

export const TEAM_MEMBER_BIO_MAX_LENGTH = 500;
