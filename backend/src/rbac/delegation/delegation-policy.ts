export const CANNOT_DELEGATE_MESSAGE =
  'You cannot grant a permission you do not have';

export const CANNOT_CHANGE_OWN_ROLES_MESSAGE =
  'You cannot change your own roles';

export function permissionsOutsideGrant(
  actorPermissions: ReadonlySet<string>,
  requested: readonly string[],
  superAdmin: boolean,
): string[] {
  if (superAdmin) {
    return [];
  }

  return requested.filter((key) => !actorPermissions.has(key));
}

export function isSelfRoleChange(
  actorId: string,
  targetUserId: string,
  superAdmin: boolean,
): boolean {
  return !superAdmin && actorId === targetUserId;
}
