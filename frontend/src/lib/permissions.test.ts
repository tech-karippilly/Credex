import { describe, expect, it } from "vitest";
import {
  adminNavSections,
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
    expect(visibleAdminTabs(access).map((item) => item.id)).toEqual(["overview", "expenses"]);
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

  it("places Users and Roles under User Management", () => {
    const access = { superAdmin: false, permissions: ["users.read", "roles.read"] };
    const userGroup = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "user_management",
    );
    expect(userGroup).toEqual({
      type: "group",
      id: "user_management",
      label: "User Management",
      items: [
        expect.objectContaining({ id: "users", label: "Users" }),
        expect.objectContaining({ id: "roles", label: "Roles" }),
      ],
    });
  });

  it("shows the Leads tab only with leads.read", () => {
    const access = { superAdmin: false, permissions: ["leads.read"] };
    expect(canEnterAdmin(access)).toBe(true);
    expect(canSeeAdminTab(access, "leads")).toBe(true);
    expect(canSeeAdminTab(access, "enquiries")).toBe(false);
    expect(visibleAdminTabs(access).map((item) => item.id)).toEqual(["overview", "leads"]);
  });

  it("places Enquiries and Leads under Lead Management", () => {
    const access = {
      superAdmin: false,
      permissions: ["enquiries.read", "leads.read"],
    };
    const leadGroup = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "lead_management",
    );
    expect(leadGroup).toEqual({
      type: "group",
      id: "lead_management",
      label: "Lead Management",
      items: [
        expect.objectContaining({ id: "enquiries", label: "Enquiries" }),
        expect.objectContaining({ id: "leads", label: "Leads" }),
      ],
    });
  });

  it("places Site & Contact, Services, and Team under Site Management", () => {
    const access = {
      superAdmin: false,
      permissions: ["site_contact.read", "services.read", "team_members.read"],
    };
    const siteGroup = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "site_management",
    );
    expect(siteGroup).toEqual({
      type: "group",
      id: "site_management",
      label: "Site Management",
      items: [
        expect.objectContaining({ id: "settings", label: "Site & Contact" }),
        expect.objectContaining({ id: "services", label: "Services" }),
        expect.objectContaining({ id: "team", label: "Team" }),
      ],
    });
  });

  it("places Careers and Applications under Career Management", () => {
    const access = {
      superAdmin: false,
      permissions: ["careers.read", "applications.read"],
    };
    const careerGroup = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "career_management",
    );
    expect(careerGroup).toEqual({
      type: "group",
      id: "career_management",
      label: "Career Management",
      items: [
        expect.objectContaining({ id: "jobs", label: "Careers" }),
        expect.objectContaining({ id: "applications", label: "Applications" }),
      ],
    });
  });

  it("places Employee Management under the HR menu", () => {
    const access = { superAdmin: false, permissions: ["employees.read"] };
    expect(canSeeAdminTab(access, "employees")).toBe(true);
    expect(canEnterAdmin(access)).toBe(true);
    const hr = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "hr",
    );
    expect(hr).toEqual({
      type: "group",
      id: "hr",
      label: "HR",
      items: [
        expect.objectContaining({
          id: "employees",
          label: "Employee Management",
        }),
        expect.objectContaining({
          id: "departments",
          label: "Departments",
        }),
        expect.objectContaining({
          id: "designations",
          label: "Designations",
        }),
      ],
    });
  });

  it("places Salary Management under the HR menu", () => {
    const access = { superAdmin: false, permissions: ["salaries.read"] };
    expect(canSeeAdminTab(access, "salaries")).toBe(true);
    const hr = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "hr",
    );
    expect(hr).toEqual({
      type: "group",
      id: "hr",
      label: "HR",
      items: [
        expect.objectContaining({
          id: "salaries",
          label: "Salary Management",
        }),
      ],
    });
  });

  it("places finance modules under Expenses Management", () => {
    const access = {
      superAdmin: false,
      permissions: ["expenses.read", "vouchers.read", "payments.read", "expense_categories.read"],
    };
    const expensesGroup = adminNavSections(access).find(
      (section) => section.type === "group" && section.id === "expenses",
    );
    expect(expensesGroup).toEqual({
      type: "group",
      id: "expenses",
      label: "Expenses Management",
      items: [
        expect.objectContaining({ id: "expenses", label: "Expenses" }),
        expect.objectContaining({ id: "expense-categories", label: "Expense Categories" }),
        expect.objectContaining({ id: "vouchers", label: "Vouchers" }),
        expect.objectContaining({ id: "payments", label: "Payments" }),
      ],
    });
  });

  it("hides HR when the account cannot view employees", () => {
    const access = { superAdmin: false, permissions: ["employees.create"] };
    expect(canSeeAdminTab(access, "employees")).toBe(false);
    expect(adminNavSections(access).some((section) => section.type === "group")).toBe(false);
  });

  it("does not reveal Leads from a write permission alone", () => {
    const access = { superAdmin: false, permissions: ["leads.create"] };
    expect(canSeeAdminTab(access, "leads")).toBe(false);
    expect(canEnterAdmin(access)).toBe(false);
  });
});
