import {
  isUserActive,
  isUserSuperAdmin,
  readAuthVersion,
  tokenAuthVersion,
} from './user-account.util';

describe('user account helpers', () => {
  it('treats a missing active flag as active', () => {
    expect(isUserActive({})).toBe(true);
    expect(isUserActive({ isActive: true })).toBe(true);
    expect(isUserActive({ isActive: false })).toBe(false);
  });

  it('treats a missing super-admin flag as false', () => {
    expect(isUserSuperAdmin({})).toBe(false);
    expect(isUserSuperAdmin({ isSuperAdmin: true })).toBe(true);
  });

  it('treats a missing auth version as zero', () => {
    expect(readAuthVersion({})).toBe(0);
    expect(readAuthVersion({ authVersion: 2 })).toBe(2);
    expect(tokenAuthVersion({})).toBe(0);
    expect(tokenAuthVersion({ authVersion: 3 })).toBe(3);
  });
});
