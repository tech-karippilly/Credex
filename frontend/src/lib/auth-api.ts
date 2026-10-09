import { apiRequest } from "./api";
import type { AuthUser, LoginResponse } from "./api-types";
import { clearAuthSession, getRefreshToken, setAuthSession } from "./auth-storage";

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setAuthSession(
      { accessToken: data.accessToken, refreshToken: data.refreshToken },
      data.user,
    );
    return data;
  },

  async profile(): Promise<AuthUser> {
    return apiRequest<AuthUser>("/auth/profile", { auth: true });
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest<null>("/auth/logout", {
          method: "POST",
          auth: true,
          json: { refreshToken },
        });
      }
    } finally {
      clearAuthSession();
    }
  },
};
