import { PermissionWhenPresent } from '../decorators/require-permissions.decorator';

export function collectRequiredPermissions(
  required: readonly string[] | undefined,
  conditional: readonly PermissionWhenPresent[] | undefined,
  body: unknown,
): string[] {
  const needed = [...(required ?? [])];
  if (!body || typeof body !== 'object') {
    return needed;
  }

  const record = body as Record<string, unknown>;
  for (const rule of conditional ?? []) {
    if (record[rule.field] !== undefined) {
      needed.push(...rule.permissions);
    }
  }

  return needed;
}
