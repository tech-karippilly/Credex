import { PERMISSION_CATALOGUE } from './permission-catalog';

describe('permission catalogue', () => {
  it('uses stable unique keys derived from module and action', () => {
    const keys = PERMISSION_CATALOGUE.map((permission) => permission.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const permission of PERMISSION_CATALOGUE) {
      expect(permission.key).toBe(`${permission.module}.${permission.action}`);
      expect(permission.key).toMatch(/^[a-z0-9_]+\.[a-z0-9_.]+$/);
      expect(permission.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('covers the modules that will need authorization', () => {
    const modules = new Set(
      PERMISSION_CATALOGUE.map((permission) => permission.module),
    );

    expect([...modules].sort()).toEqual(
      [
        'applications',
        'careers',
        'enquiries',
        'expense_categories',
        'expenses',
        'leads',
        'payments',
        'reports',
        'roles',
        'services',
        'site_contact',
        'team_members',
        'users',
        'vouchers',
      ].sort(),
    );
  });
});
