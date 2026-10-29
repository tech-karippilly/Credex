import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AdminAccess, AdminTab } from "@/lib/permissions";
import { AdminSidebarNav } from "./admin-nav";

const superAdmin: AdminAccess = { superAdmin: true, permissions: [] };

function renderNav(access: AdminAccess, tab: AdminTab = "overview") {
  const onSelect = vi.fn();
  const view = render(<AdminSidebarNav access={access} tab={tab} onSelect={onSelect} />);
  return { onSelect, ...view };
}

describe("AdminSidebarNav", () => {
  it("keeps Dashboard standalone and collapses groups until opened", () => {
    renderNav(superAdmin);

    expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Expenses Management" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Vouchers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Roles" })).not.toBeInTheDocument();
  });

  it("expands a group without closing another and selects the existing page", () => {
    const { onSelect, rerender } = renderNav(superAdmin);

    fireEvent.click(screen.getByRole("button", { name: "Expenses Management" }));
    expect(screen.getByRole("button", { name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expense Categories" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Payments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reports" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lead Management" }));
    expect(screen.getByRole("button", { name: "Expenses Management" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Enquiries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leads" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vouchers" }));
    expect(onSelect).toHaveBeenCalledWith("vouchers");
    expect(screen.getByRole("button", { name: "Expenses Management" })).toHaveAttribute("aria-expanded", "true");

    rerender(<AdminSidebarNav access={superAdmin} tab="vouchers" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "Vouchers" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("opens the parent group for the active page on first render", () => {
    renderNav(superAdmin, "payments");

    expect(screen.getByRole("button", { name: "Expenses Management" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Payments" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Leads" })).not.toBeInTheDocument();
  });

  it("hides a group with no accessible children and hides forbidden siblings", () => {
    renderNav({ superAdmin: false, permissions: ["leads.read", "careers.read"] }, "leads");

    expect(screen.getByRole("button", { name: "Lead Management" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Leads" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Enquiries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expenses Management" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Careers Management" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Careers Management" }));
    expect(screen.getByRole("button", { name: "Careers" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Applications" })).not.toBeInTheDocument();
  });
});
