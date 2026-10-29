import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV,
  ADMIN_NAV_GROUPS,
  canEnterAdmin,
  canSeeAdminTab,
  canSeeDashboardCard,
  DASHBOARD_CARDS,
  hasAnyPermission,
  hasPermission,
  visibleAdminNav,
  visibleAdminTabs,
  visibleDashboardCards,
} from "./permissions";

describe("admin permission helpers", () => {
  it("does not treat careers access as access to the whole admin shell", () => {
    const access = { superAdmin: false, permissions: ["expenses.read"] };
    expect(canEnterAdmin(access)).toBe(true);
    expect(canSeeAdminTab(access, "expenses")).toBe(true);
    expect(canSeeAdminTab(access, "jobs")).toBe(false);
    expect(visibleAdminTabs(access).map((item) => item.id)).toEqual([
      "overview",
      "expenses",
    ]);
  });

  it("keeps the super administrator on every module", () => {
    const access = { superAdmin: true, permissions: [] };
    expect(canEnterAdmin(access)).toBe(true);
    expect(canSeeAdminTab(access, "users")).toBe(true);
    expect(canSeeAdminTab(access, "roles")).toBe(true);
    expect(hasPermission([], "reports.export", true)).toBe(true);
  });

  it("does not treat a write permission as permission to read the module", () => {
    const permissions = ["expenses.delete", "reports.export"];
    expect(hasPermission(permissions, "expenses.read")).toBe(false);
    expect(hasAnyPermission(permissions, ["expenses.read"])).toBe(false);
    expect(canEnterAdmin({ superAdmin: false, permissions })).toBe(false);
  });

  it("shows user and role management only with those read permissions", () => {
    const access = { superAdmin: false, permissions: ["users.read"] };
    expect(canSeeAdminTab(access, "users")).toBe(true);
    expect(canSeeAdminTab(access, "roles")).toBe(false);
  });

  it("shows the Leads tab only with leads.read", () => {
    const access = { superAdmin: false, permissions: ["leads.read"] };
    expect(canEnterAdmin(access)).toBe(true);
    expect(canSeeAdminTab(access, "leads")).toBe(true);
    expect(canSeeAdminTab(access, "enquiries")).toBe(false);
    expect(visibleAdminTabs(access).map((item) => item.id)).toEqual(["overview", "leads"]);
  });

  it("does not reveal Leads from a write permission alone", () => {
    const access = { superAdmin: false, permissions: ["leads.create"] };
    expect(canSeeAdminTab(access, "leads")).toBe(false);
    expect(canEnterAdmin(access)).toBe(false);
  });

  it("gates the Expenses Summary card with its dedicated dashboard permission", () => {
    const withCard = {
      superAdmin: false,
      permissions: ["dashboard.expenses_summary.read"],
    };
    const withExpensesModule = {
      superAdmin: false,
      permissions: ["expenses.read"],
    };

    expect(canSeeDashboardCard(withCard, "expenses_summary")).toBe(true);
    expect(canSeeDashboardCard(withExpensesModule, "expenses_summary")).toBe(
      false,
    );
    expect(visibleDashboardCards(withCard).map((card) => card.id)).toEqual([
      "expenses_summary",
    ]);
  });

  it("gates the Expenses by Category card with its dedicated dashboard permission", () => {
    const withCard = {
      superAdmin: false,
      permissions: ["dashboard.expenses_by_category.read"],
    };
    const withExpensesModule = {
      superAdmin: false,
      permissions: ["expenses.read"],
    };

    expect(canSeeDashboardCard(withCard, "expenses_by_category")).toBe(true);
    expect(
      canSeeDashboardCard(withExpensesModule, "expenses_by_category"),
    ).toBe(false);
    expect(visibleDashboardCards(withCard).map((card) => card.id)).toEqual([
      "expenses_by_category",
    ]);
  });

  it("maps each dashboard card to a distinct permission", () => {
    const permissions = DASHBOARD_CARDS.map((card) => card.permission);
    expect(new Set(permissions).size).toBe(permissions.length);

    const access = {
      superAdmin: false,
      permissions: [
        "services.read",
        "dashboard.expenses_summary.read",
        "dashboard.expenses_by_category.read",
      ],
    };
    expect(visibleDashboardCards(access).map((card) => card.id)).toEqual([
      "services",
      "expenses_summary",
      "expenses_by_category",
    ]);
    expect(canSeeDashboardCard(access, "leads")).toBe(false);
  });

  it("lets the super administrator see every dashboard card", () => {
    const access = { superAdmin: true, permissions: [] };
    expect(visibleDashboardCards(access)).toHaveLength(DASHBOARD_CARDS.length);
  });

  it("places every admin module in one group and keeps Dashboard standalone", () => {
    const grouped = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(
      ADMIN_NAV.map((item) => item.id)
        .filter((id) => id !== "overview")
        .sort(),
    );
  });

  it("hides groups the user cannot enter and keeps only permitted children", () => {
    const expensesOnly = { superAdmin: false, permissions: ["expenses.read"] };
    expect(visibleAdminNav(expensesOnly).map(describeEntry)).toEqual([
      "link:overview",
      "group:expenses[expenses]",
    ]);

    const leadsOnly = { superAdmin: false, permissions: ["leads.read"] };
    expect(visibleAdminNav(leadsOnly).map(describeEntry)).toEqual([
      "link:overview",
      "group:leads[leads]",
    ]);

    const usersOnly = { superAdmin: false, permissions: ["users.read"] };
    expect(visibleAdminNav(usersOnly).map(describeEntry)).toEqual([
      "link:overview",
      "group:users[users]",
    ]);
  });

  it("shows every group to a super administrator without granting extra tabs", () => {
    const access = { superAdmin: true, permissions: [] };
    const nav = visibleAdminNav(access);
    expect(nav.flatMap((entry) => (entry.kind === "group" ? [entry.id] : []))).toEqual([
      "expenses",
      "leads",
      "users",
      "organization",
      "careers",
    ]);
    const shown = nav.flatMap((entry) => (entry.kind === "link" ? [entry.item.id] : entry.items.map((item) => item.id)));
    expect([...shown].sort()).toEqual(ADMIN_NAV.map((item) => item.id).sort());
    expect(new Set(shown).size).toBe(shown.length);
    expect(canSeeAdminTab(access, "roles")).toBe(true);
    expect(canSeeAdminTab({ superAdmin: false, permissions: ["users.read"] }, "roles")).toBe(false);
  });
});

function describeEntry(entry: ReturnType<typeof visibleAdminNav>[number]): string {
  if (entry.kind === "link") return `link:${entry.item.id}`;
  return `group:${entry.id}[${entry.items.map((item) => item.id).join(",")}]`;
}

