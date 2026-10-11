export function isUserActive(user: { isActive?: boolean | null }): boolean {
  return user.isActive !== false;
}

export function isUserSuperAdmin(user: {
  isSuperAdmin?: boolean | null;
}): boolean {
  return user.isSuperAdmin === true;
}

export function readAuthVersion(user: { authVersion?: number | null }): number {
  return typeof user.authVersion === 'number' &&
    Number.isFinite(user.authVersion)
    ? user.authVersion
    : 0;
}

export function tokenAuthVersion(payload: { authVersion?: number }): number {
  return typeof payload.authVersion === 'number' &&
    Number.isFinite(payload.authVersion)
    ? payload.authVersion
    : 0;
}
