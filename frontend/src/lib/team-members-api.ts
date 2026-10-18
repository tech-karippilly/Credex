import { apiRequest } from "./api";
import type { TeamMember, TeamMemberAdmin } from "./api-types";

export type CreateTeamMemberPayload = {
  fullName: string;
  designation: string;
  department: string;
  positionInCompany: string;
  bio?: string;
  order: number;
};

export type UpdateTeamMemberPayload = Partial<CreateTeamMemberPayload>;

export type TeamMemberStatus = "draft" | "published" | "inactive";

export const teamMembersApi = {
  listPublic(): Promise<TeamMember[]> {
    return apiRequest<TeamMember[]>("/team-members");
  },

  listAdmin(): Promise<TeamMemberAdmin[]> {
    return apiRequest<TeamMemberAdmin[]>("/team-members/admin", { auth: true });
  },

  getAdmin(id: string): Promise<TeamMemberAdmin> {
    return apiRequest<TeamMemberAdmin>(`/team-members/admin/${id}`, { auth: true });
  },

  create(payload: CreateTeamMemberPayload): Promise<TeamMemberAdmin> {
    return apiRequest<TeamMemberAdmin>("/team-members", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateTeamMemberPayload): Promise<TeamMemberAdmin> {
    return apiRequest<TeamMemberAdmin>(`/team-members/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateStatus(id: string, status: TeamMemberStatus): Promise<{ id: string; status: TeamMemberStatus }> {
    return apiRequest<{ id: string; status: TeamMemberStatus }>(`/team-members/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { status },
    });
  },

  uploadPhoto(id: string, file: File): Promise<TeamMemberAdmin> {
    const formData = new FormData();
    formData.append("image", file);
    return apiRequest<TeamMemberAdmin>(`/team-members/${id}/photo`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  deletePhoto(id: string): Promise<TeamMemberAdmin> {
    return apiRequest<TeamMemberAdmin>(`/team-members/${id}/photo`, {
      method: "DELETE",
      auth: true,
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/team-members/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },
};
