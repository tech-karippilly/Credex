import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'rbac:permissions';
export const PERMISSIONS_WHEN_PRESENT_KEY = 'rbac:permissions-when-present';

export interface PermissionWhenPresent {
  field: string;
  permissions: string[];
}

/**
 * Every listed permission is required. A read permission does not imply
 * another action, and this decorator does not treat the list as alternatives.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Extra permissions required when a body field is present.
 * Use this when one route can both edit a record and change a separately
 * controlled status. The base `@RequirePermissions` still apply.
 */
export const RequirePermissionsWhenPresent = (
  field: string,
  ...permissions: string[]
) =>
  SetMetadata(PERMISSIONS_WHEN_PRESENT_KEY, [
    { field, permissions },
  ] satisfies PermissionWhenPresent[]);
