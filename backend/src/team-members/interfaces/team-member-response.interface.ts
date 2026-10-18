import type { TeamMemberStatus } from '../constants/team-member.constants';

export interface TeamMemberPhotoPublic {
  url: string;
}

export interface TeamMemberPhotoAdmin {
  url: string;
  publicId: string;
}

export interface TeamMemberPublicResponse {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  positionInCompany: string;
  bio: string;
  photo: TeamMemberPhotoPublic;
  order: number;
}

export interface TeamMemberAdminResponse {
  id: string;
  fullName: string;
  designation: string;
  department: string;
  positionInCompany: string;
  bio: string;
  photo: TeamMemberPhotoAdmin | null;
  order: number;
  status: TeamMemberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberStatusResponse {
  id: string;
  status: TeamMemberStatus;
}
