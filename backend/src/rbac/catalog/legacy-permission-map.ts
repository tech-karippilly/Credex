/**
 * Older roles store permission codes on the role document itself.
 * The admin shell and API guards use the current catalogue keys.
 */
const LEGACY_PERMISSION_MAP: Readonly<Record<string, readonly string[]>> = {
  USER_VIEW: ['users.read'],
  USER_CREATE: ['users.create'],
  USER_UPDATE: ['users.update'],
  USER_DISABLE: ['users.status.update'],
  USER_DELETE: ['users.delete'],

  ROLE_VIEW: ['roles.read'],
  ROLE_CREATE: ['roles.create'],
  ROLE_UPDATE: ['roles.update', 'roles.permissions.update'],
  ROLE_DELETE: ['roles.delete'],

  JOB_VIEW: ['careers.read'],
  JOB_CREATE: ['careers.create'],
  JOB_UPDATE: ['careers.update'],
  JOB_DELETE: ['careers.delete'],
  JOB_STATUS_UPDATE: ['careers.status.update'],

  APPLICATION_VIEW: ['applications.read'],
  APPLICATION_STATUS_UPDATE: ['applications.status.update'],

  CMS_VIEW: ['services.read', 'site_contact.read'],
  CMS_CREATE: ['services.create'],
  CMS_UPDATE: ['services.update', 'site_contact.update'],
  CMS_DELETE: ['services.delete'],

  SYSTEM_SETTINGS_VIEW: ['site_contact.read'],
  SYSTEM_SETTINGS_UPDATE: ['site_contact.update'],

  ACCOUNT_VIEW: ['expenses.read', 'expense_categories.read'],
  ACCOUNT_CREATE: ['expenses.create', 'expense_categories.create'],
  ACCOUNT_UPDATE: ['expenses.update', 'expense_categories.update'],
  ACCOUNT_DELETE: ['expenses.delete', 'expense_categories.delete'],

  VOUCHER_VIEW: ['vouchers.read'],
  VOUCHER_CREATE: ['vouchers.create'],
  VOUCHER_UPDATE: ['vouchers.update'],
  VOUCHER_SUBMIT: ['vouchers.status.update'],
  VOUCHER_APPROVE: ['vouchers.status.update'],
  VOUCHER_REJECT: ['vouchers.status.update'],
  VOUCHER_POST: ['vouchers.status.update'],
  VOUCHER_CANCEL: ['vouchers.status.update'],

  LEDGER_VIEW: ['reports.read'],
  REPORT_VIEW: ['reports.read'],
};

export function mapLegacyPermissionCodes(codes: readonly string[]): string[] {
  const keys = new Set<string>();
  for (const code of codes) {
    const mapped = LEGACY_PERMISSION_MAP[code];
    if (!mapped) {
      continue;
    }
    for (const key of mapped) {
      keys.add(key);
    }
  }
  return [...keys].sort();
}
