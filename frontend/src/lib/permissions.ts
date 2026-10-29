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
  { id: "overview", label: "Dashboard" },
  { id: "settings", label: "Site & Contact", anyOf: ["site_contact.read", "site_contact.update"] },
  { id: "services", label: "Services", anyOf: ["services.read"] },
  { id: "team", label: "Team Members", anyOf: ["team_members.read"] },
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

export type AdminNavGroupId =
  | "expenses"
  | "leads"
  | "users"
  | "organization"
  | "careers";

export interface AdminNavGroup {
  id: AdminNavGroupId;
  label: string;
  items: readonly AdminTab[];
}

/** Sidebar groups. Child order is the submenu order. Dashboard stays outside these groups. */
export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    id: "expenses",
    label: "Expenses Management",
    items: ["expenses", "expense-categories", "vouchers", "payments", "reports"],
  },
  {
    id: "leads",
    label: "Lead Management",
    items: ["enquiries", "leads"],
  },
  {
    id: "users",
    label: "User Management",
    items: ["users", "roles"],
  },
  {
    id: "organization",
    label: "Organization Management",
    items: ["settings", "services", "team"],
  },
  {
    id: "careers",
    label: "Careers Management",
    items: ["jobs", "applications"],
  },
];

export type VisibleAdminNavEntry =
  | { kind: "link"; item: AdminNavItem }
  | { kind: "group"; id: AdminNavGroupId; label: string; items: readonly AdminNavItem[] };

const ADMIN_NAV_BY_ID = new Map(ADMIN_NAV.map((item) => [item.id, item]));

export function adminNavGroupForTab(tab: AdminTab): AdminNavGroup | undefined {
  return ADMIN_NAV_GROUPS.find((group) => group.items.includes(tab));
}

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
  dashboard: "Dashboard",
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
  "expenses_summary.read": "Expenses summary",
  "expenses_by_category.read": "Expenses by category",
};

/**
 * Overview dashboard cards and the permission that gates each card.
 * CMS count cards reuse module read permissions so existing roles keep access.
 * Expenses Summary uses a dedicated dashboard permission so it does not imply
 * full Expenses module access.
 */
export type DashboardCardId =
  | "services"
  | "jobs"
  | "applications"
  | "enquiries"
  | "leads"
  | "expenses_summary"
  | "expenses_by_category";

export interface DashboardCardDefinition {
  id: DashboardCardId;
  label: string;
  permission: string;
  /** When set, clicking the card navigates to this admin tab. */
  tab?: AdminTab;
  supportsPeriodFilter: boolean;
}

export const DASHBOARD_CARDS: readonly DashboardCardDefinition[] = [
  {
    id: "services",
    label: "Services",
    permission: "services.read",
    tab: "services",
    supportsPeriodFilter: false,
  },
  {
    id: "jobs",
    label: "Job openings",
    permission: "careers.read",
    tab: "jobs",
    supportsPeriodFilter: false,
  },
  {
    id: "applications",
    label: "Applications",
    permission: "applications.read",
    tab: "applications",
    supportsPeriodFilter: false,
  },
  {
    id: "enquiries",
    label: "Enquiries",
    permission: "enquiries.read",
    tab: "enquiries",
    supportsPeriodFilter: false,
  },
  {
    id: "leads",
    label: "Leads",
    permission: "leads.read",
    tab: "leads",
    supportsPeriodFilter: false,
  },
  {
    id: "expenses_summary",
    label: "Expenses Summary",
    permission: "dashboard.expenses_summary.read",
    supportsPeriodFilter: true,
  },
  {
    id: "expenses_by_category",
    label: "Expenses by Category",
    permission: "dashboard.expenses_by_category.read",
    supportsPeriodFilter: true,
  },
];
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

export function canSeeDashboardCard(
  access: AdminAccess,
  cardId: DashboardCardId,
): boolean {
  const card = DASHBOARD_CARDS.find((entry) => entry.id === cardId);
  if (!card) return false;
  return hasPermission(access.permissions, card.permission, access.superAdmin);
}

export function visibleDashboardCards(
  access: AdminAccess,
): DashboardCardDefinition[] {
  return DASHBOARD_CARDS.filter((card) => canSeeDashboardCard(access, card.id));
}

export function visibleAdminTabs(access: AdminAccess): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => canSeeAdminTab(access, item.id));
}

/**
 * Sidebar structure for the current user.
 * A group is included only when at least one child tab is visible.
 * Items that are not in a group stay as standalone links, so new modules
 * are not dropped from the menu before they are grouped.
 */
export function visibleAdminNav(access: AdminAccess): VisibleAdminNavEntry[] {
  const entries: VisibleAdminNavEntry[] = [];
  const placed = new Set<AdminTab>();

  const overview = ADMIN_NAV_BY_ID.get("overview");
  if (overview && canSeeAdminTab(access, overview.id)) {
    entries.push({ kind: "link", item: overview });
    placed.add(overview.id);
  }

  for (const group of ADMIN_NAV_GROUPS) {
    const items = group.items.flatMap((id) => {
      const item = ADMIN_NAV_BY_ID.get(id);
      if (!item || !canSeeAdminTab(access, item.id)) return [];
      placed.add(item.id);
      return [item];
    });
    if (items.length === 0) continue;
    entries.push({
      kind: "group",
      id: group.id,
      label: group.label,
      items,
    });
  }

  for (const item of ADMIN_NAV) {
    if (placed.has(item.id) || !canSeeAdminTab(access, item.id)) continue;
    entries.push({ kind: "link", item });
  }

  return entries;
}

export function permissionModuleLabel(module: string): string {
  return PERMISSION_MODULE_LABELS[module] ?? module;
}

export function permissionActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
