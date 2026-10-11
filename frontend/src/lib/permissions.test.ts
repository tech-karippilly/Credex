import { describe, expect, it } from "vitest";
import {
  canEnterAdmin,
  canSeeAdminTab,
  hasAnyPermission,
  hasPermission,
  visibleAdminTabs,
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
});
