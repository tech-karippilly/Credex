import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SalaryRecord } from "@/lib/salaries-api";
import { SalariesPanel } from "./salaries-panel";

const { list, update } = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/salaries-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/salaries-api")>("@/lib/salaries-api");
  return {
    ...actual,
    salariesApi: { list, update },
  };
});

const row: SalaryRecord = {
  employeeId: "emp-1",
  employeeCode: "NF-0001",
  fullName: "Ada Lovelace",
  department: "Support",
  designation: "Engineer",
  status: "active",
  basePay: 40000,
  houseRentAllowance: 0,
  esi: 0,
  pf: 0,
  tax: 0,
  gross: 40000,
  deductions: 0,
  netPay: 40000,
  updatedAt: null,
};

describe("SalariesPanel", () => {
  beforeEach(() => {
    list.mockReset();
    update.mockReset();
    list.mockResolvedValue([row]);
  });

  it("lists employees with their current salary", async () => {
    render(<SalariesPanel />);

    expect(await screen.findByRole("heading", { name: "Salary Management" })).toBeInTheDocument();
    expect(screen.getByText("NF-0001")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getAllByText("₹40,000.00").length).toBeGreaterThan(0);
  });

  it("saves base pay, ESI, and PF from the employee salary details", async () => {
    update.mockResolvedValue({
      ...row,
      basePay: 45000,
      esi: 500,
      pf: 1800,
      gross: 45000,
      deductions: 2300,
      netPay: 42700,
    });
    render(<SalariesPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    expect(await screen.findByRole("heading", { name: /Ada Lovelace/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Base pay"), { target: { value: "45000" } });
    fireEvent.change(screen.getByLabelText("ESI"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("PF"), { target: { value: "1800" } });
    fireEvent.click(screen.getByRole("button", { name: "Save salary" }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith("emp-1", {
        basePay: 45000,
        houseRentAllowance: 0,
        esi: 500,
        pf: 1800,
        tax: 0,
      });
    });
    expect(await screen.findByText("Salary saved.")).toBeInTheDocument();
  });
});
