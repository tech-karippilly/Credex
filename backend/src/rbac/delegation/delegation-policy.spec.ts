import {
  isSelfRoleChange,
  permissionsOutsideGrant,
} from './delegation-policy';

describe('delegation policy', () => {
  const held = new Set(['expenses.read', 'users.read']);

  it('lets a super administrator grant any permission', () => {
    expect(
      permissionsOutsideGrant(held, ['payments.delete'], true),
    ).toEqual([]);
  });

  it('rejects permissions the actor does not hold', () => {
    expect(
      permissionsOutsideGrant(held, ['expenses.read', 'payments.delete'], false),
    ).toEqual(['payments.delete']);
  });

  it('blocks a normal user from changing their own roles', () => {
    expect(isSelfRoleChange('user-1', 'user-1', false)).toBe(true);
    expect(isSelfRoleChange('admin', 'user-1', true)).toBe(false);
    expect(isSelfRoleChange('user-1', 'user-2', false)).toBe(false);
  });
});
