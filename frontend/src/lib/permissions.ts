export type AdminTab =
  | "overview"
  | "settings"
  | "services"
  | "team"
  | "jobs"
  | "applications"
  | "enquiries"
  | "leads"
  | "expenses"
  | "expense-categories"
  | "vouchers"
  | "payments"
  | "reports"
  | "users"
  | "roles";

export interface AdminAccess {
  superAdmin: boolean;
  permissions: string[];
}

export interface AdminNavItem {
  id: AdminTab;
  label: string;
  anyOf?: readonly string[];
}

/**
 * Navigation is based on read permissions.
 * Site & Contact also accepts site_contact.update because the settings
 * document is already public and update is the protected admin action.
 * A create or delete permission does not reveal a module on its own.
 */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "settings", label: "Site & Contact", anyOf: ["site_contact.read", "site_contact.update"] },
  { id: "services", label: "Services", anyOf: ["services.read"] },
  { id: "team", label: "Team", anyOf: ["team_members.read"] },
  { id: "jobs", label: "Careers", anyOf: ["careers.read"] },
  { id: "applications", label: "Applications", anyOf: ["applications.read"] },
  { id: "enquiries", label: "Enquiries", anyOf: ["enquiries.read"] },
  { id: "leads", label: "Leads", anyOf: ["leads.read"] },
  { id: "expenses", label: "Expenses", anyOf: ["expenses.read"] },
  { id: "expense-categories", label: "Expense Categories", anyOf: ["expense_categories.read"] },
  { id: "vouchers", label: "Vouchers", anyOf: ["vouchers.read"] },
  { id: "payments", label: "Payments", anyOf: ["payments.read"] },
  { id: "reports", label: "Reports", anyOf: ["reports.read"] },
  { id: "users", label: "Users", anyOf: ["users.read"] },
  { id: "roles", label: "Roles", anyOf: ["roles.read"] },
];

export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  users: "Users",
  roles: "Roles",
  careers: "Careers",
  services: "Services",
  team_members: "Team",
  applications: "Applications",
  site_contact: "Site & Contact",
  enquiries: "Enquiries",
  leads: "Leads",
  expense_categories: "Expense Categories",
  expenses: "Expenses",
  vouchers: "Vouchers",
  payments: "Payments",
  reports: "Reports",
};

const ACTION_LABELS: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  "status.update": "Change status",
  export: "Export",
  import: "Import",
  assign: "Assign",
  analyze: "Analyze",
  send_email: "Send email",
  send_whatsapp: "Send WhatsApp",
  "permissions.update": "Edit permissions",
};

export function hasPermission(
  permissions: readonly string[],
  key: string,
  superAdmin = false,
): boolean {
  return superAdmin || permissions.includes(key);
}

export function hasAnyPermission(
  permissions: readonly string[],
  keys: readonly string[],
  superAdmin = false,
): boolean {
  return superAdmin || keys.some((key) => permissions.includes(key));
}

export function canEnterAdmin(access: AdminAccess): boolean {
  if (access.superAdmin) return true;
  return ADMIN_NAV.some(
    (item) => item.anyOf && hasAnyPermission(access.permissions, item.anyOf),
  );
}

export function canSeeAdminTab(access: AdminAccess, tab: AdminTab): boolean {
  const item = ADMIN_NAV.find((entry) => entry.id === tab);
  if (!item?.anyOf) return true;
  return hasAnyPermission(access.permissions, item.anyOf, access.superAdmin);
}

export function visibleAdminTabs(access: AdminAccess): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => canSeeAdminTab(access, item.id));
}

export function permissionModuleLabel(module: string): string {
  return PERMISSION_MODULE_LABELS[module] ?? module;
}

export function permissionActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
