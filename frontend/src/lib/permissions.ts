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
  | "fixed-expenses"
  | "expense-categories"
  | "vouchers"
  | "payments"
  | "reports"
  | "employees"
  | "salaries"
  | "attendance"
  | "departments"
  | "designations"
  | "users"
  | "roles";

export interface AdminAccess {
  superAdmin: boolean;
  permissions: string[];
}

export type AdminNavGroupId =
  | "hr"
  | "expenses"
  | "lead_management"
  | "site_management"
  | "career_management"
  | "user_management";

export interface AdminNavItem {
  id: AdminTab;
  label: string;
  anyOf?: readonly string[];
  group?: AdminNavGroupId;
}

export const ADMIN_NAV_GROUP_LABELS: Record<AdminNavGroupId, string> = {
  hr: "HR",
  expenses: "Expenses Management",
  lead_management: "Lead Management",
  site_management: "Site Management",
  career_management: "Career Management",
  user_management: "User Management",
};

export type AdminNavSection =
  | { type: "item"; item: AdminNavItem }
  | { type: "group"; id: AdminNavGroupId; label: string; items: AdminNavItem[] };

/**
 * Navigation is based on read permissions.
 * Site & Contact also accepts site_contact.update because the settings
 * document is already public and update is the protected admin action.
 * A create or delete permission does not reveal a module on its own.
 */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  { id: "overview", label: "Overview" },
  {
    id: "settings",
    label: "Site & Contact",
    group: "site_management",
    anyOf: ["site_contact.read", "site_contact.update"],
  },
  { id: "services", label: "Services", group: "site_management", anyOf: ["services.read"] },
  { id: "team", label: "Team", group: "site_management", anyOf: ["team_members.read"] },
  { id: "jobs", label: "Careers", group: "career_management", anyOf: ["careers.read"] },
  {
    id: "applications",
    label: "Applications",
    group: "career_management",
    anyOf: ["applications.read"],
  },
  { id: "enquiries", label: "Enquiries", group: "lead_management", anyOf: ["enquiries.read"] },
  { id: "leads", label: "Leads", group: "lead_management", anyOf: ["leads.read"] },
  { id: "expenses", label: "Expenses", group: "expenses", anyOf: ["expenses.read"] },
  {
    id: "fixed-expenses",
    label: "Fixed Expenses",
    group: "expenses",
    anyOf: ["fixed_expenses.read"],
  },
  {
    id: "expense-categories",
    label: "Expense Categories",
    group: "expenses",
    anyOf: ["expense_categories.read"],
  },
  { id: "vouchers", label: "Vouchers", group: "expenses", anyOf: ["vouchers.read"] },
  { id: "payments", label: "Payments", group: "expenses", anyOf: ["payments.read"] },
  { id: "reports", label: "Reports", anyOf: ["reports.read"] },
  {
    id: "employees",
    label: "Employee Management",
    group: "hr",
    anyOf: ["employees.read"],
  },
  {
    id: "salaries",
    label: "Salary Management",
    group: "hr",
    anyOf: ["salaries.read"],
  },
  {
    id: "attendance",
    label: "Attendance",
    group: "hr",
    anyOf: ["attendance.read"],
  },
  {
    id: "departments",
    label: "Departments",
    group: "hr",
    anyOf: ["employees.read"],
  },
  {
    id: "designations",
    label: "Designations",
    group: "hr",
    anyOf: ["employees.read"],
  },
  { id: "users", label: "Users", group: "user_management", anyOf: ["users.read"] },
  { id: "roles", label: "Roles", group: "user_management", anyOf: ["roles.read"] },
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
  fixed_expenses: "Fixed Expenses",
  expenses: "Expenses",
  vouchers: "Vouchers",
  payments: "Payments",
  reports: "Reports",
  employees: "Employees",
  salaries: "Salary",
  attendance: "Attendance",
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
  return ADMIN_NAV.some((item) => item.anyOf && hasAnyPermission(access.permissions, item.anyOf));
}

export function canSeeAdminTab(access: AdminAccess, tab: AdminTab): boolean {
  const item = ADMIN_NAV.find((entry) => entry.id === tab);
  if (!item?.anyOf) return true;
  return hasAnyPermission(access.permissions, item.anyOf, access.superAdmin);
}

export function visibleAdminTabs(access: AdminAccess): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => canSeeAdminTab(access, item.id));
}

export function adminNavSections(access: AdminAccess): AdminNavSection[] {
  const sections: AdminNavSection[] = [];
  const groups = new Map<AdminNavGroupId, Extract<AdminNavSection, { type: "group" }>>();

  for (const item of visibleAdminTabs(access)) {
    if (!item.group) {
      sections.push({ type: "item", item });
      continue;
    }
    let group = groups.get(item.group);
    if (!group) {
      group = {
        type: "group",
        id: item.group,
        label: ADMIN_NAV_GROUP_LABELS[item.group],
        items: [],
      };
      groups.set(item.group, group);
      sections.push(group);
    }
    group.items.push(item);
  }

  return sections;
}

export function permissionModuleLabel(module: string): string {
  return PERMISSION_MODULE_LABELS[module] ?? module;
}

export function permissionActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
