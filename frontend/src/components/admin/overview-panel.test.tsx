import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExpensesByCategory, ExpensesSummary } from "@/lib/dashboard-api";
import { OverviewPanel } from "./overview-panel";

const {
  expensesSummary,
  expensesByCategory,
  listAdminServices,
  listAdminCareers,
  listApplications,
  listEnquiries,
  leadsSummary,
} = vi.hoisted(() => ({
  expensesSummary: vi.fn(),
  expensesByCategory: vi.fn(),
  listAdminServices: vi.fn(),
  listAdminCareers: vi.fn(),
  listApplications: vi.fn(),
  listEnquiries: vi.fn(),
  leadsSummary: vi.fn(),
}));

vi.mock("@/lib/dashboard-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dashboard-api")>(
    "@/lib/dashboard-api",
  );
  return {
    ...actual,
    dashboardApi: { expensesSummary, expensesByCategory },
  };
});

vi.mock("@/lib/services-api", () => ({
  servicesApi: { listAdmin: listAdminServices },
}));

vi.mock("@/lib/careers-api", () => ({
  careersApi: { listAdmin: listAdminCareers },
}));

vi.mock("@/lib/applications-api", () => ({
  applicationsApi: { list: listApplications },
}));

vi.mock("@/lib/enquiries-api", () => ({
  enquiriesApi: { list: listEnquiries },
}));

vi.mock("@/lib/leads-api", () => ({
  leadsApi: { summary: leadsSummary },
}));

function summary(overrides: Partial<ExpensesSummary> = {}): ExpensesSummary {
  return {
    dateBasis: "invoiceDate",
    month: "2026-10",
    year: 2026,
    monthNumber: 10,
    totalAmount: 1250.5,
    expenseCount: 2,
    previousMonth: {
      month: "2026-09",
      totalAmount: 1000,
      expenseCount: 1,
    },
    changeAmount: 250.5,
    changePercent: 25.05,
    ...overrides,
  };
}

function byCategory(
  overrides: Partial<ExpensesByCategory> = {},
): ExpensesByCategory {
  return {
    dateBasis: "invoiceDate",
    month: "2026-10",
    year: 2026,
    monthNumber: 10,
    totalAmount: 24494,
    expenseCount: 5,
    categories: [
      {
        categoryId: "1",
        categoryName: "Rent",
        totalAmount: 19294,
        expenseCount: 1,
        percent: 78.77,
      },
      {
        categoryId: "2",
        categoryName: "Server",
        totalAmount: 5000,
        expenseCount: 1,
        percent: 20.41,
      },
      {
        categoryId: "3",
        categoryName: "Utilities",
        totalAmount: 200,
        expenseCount: 1,
        percent: 0.82,
      },
    ],
    ...overrides,
  };
}

describe("OverviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminServices.mockResolvedValue([{ id: "1" }]);
    listAdminCareers.mockResolvedValue([{ id: "1" }, { id: "2" }]);
    listApplications.mockResolvedValue([]);
    listEnquiries.mockResolvedValue([{ id: "1" }]);
    leadsSummary.mockResolvedValue({ total: 4 });
    expensesSummary.mockResolvedValue(summary());
    expensesByCategory.mockResolvedValue(byCategory());
  });

  it("shows the expenses summary total for the selected month", async () => {
    render(
      <OverviewPanel
        go={vi.fn()}
        access={{
          superAdmin: false,
          permissions: ["dashboard.expenses_summary.read"],
        }}
      />,
    );

    expect(await screen.findByTestId("expenses-summary-card")).toBeInTheDocument();
    expect(await screen.findByText("₹1,250.50")).toBeInTheDocument();
    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(expensesSummary).toHaveBeenCalled();
  });

  it("shows expenses by category with amounts and percentages", async () => {
    render(
      <OverviewPanel
        go={vi.fn()}
        access={{
          superAdmin: false,
          permissions: ["dashboard.expenses_by_category.read"],
        }}
      />,
    );

    expect(
      await screen.findByTestId("expenses-by-category-card"),
    ).toBeInTheDocument();
    expect(await screen.findByText("₹24,494.00")).toBeInTheDocument();
    expect(screen.getByText("Expenses by Category")).toBeInTheDocument();
    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("Server")).toBeInTheDocument();
    expect(screen.getByText("78.77%")).toBeInTheDocument();
    expect(expensesByCategory).toHaveBeenCalled();
  });

  it("updates both finance cards when another month or year is selected", async () => {
    expensesSummary
      .mockResolvedValueOnce(summary())
      .mockResolvedValueOnce(
        summary({
          month: "2026-09",
          monthNumber: 9,
          totalAmount: 500,
          previousMonth: {
            month: "2026-08",
            totalAmount: 0,
            expenseCount: 0,
          },
          changeAmount: 500,
          changePercent: null,
        }),
      )
      .mockResolvedValueOnce(
        summary({
          month: "2025-09",
          year: 2025,
          monthNumber: 9,
          totalAmount: 0,
          expenseCount: 0,
          previousMonth: {
            month: "2025-08",
            totalAmount: 0,
            expenseCount: 0,
          },
          changeAmount: 0,
          changePercent: null,
        }),
      );

    expensesByCategory
      .mockResolvedValueOnce(byCategory())
      .mockResolvedValueOnce(
        byCategory({
          month: "2026-09",
          monthNumber: 9,
          totalAmount: 500,
          categories: [
            {
              categoryId: "1",
              categoryName: "Hosting",
              totalAmount: 500,
              expenseCount: 1,
              percent: 100,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        byCategory({
          month: "2025-09",
          year: 2025,
          monthNumber: 9,
          totalAmount: 0,
          expenseCount: 0,
          categories: [],
        }),
      );

    render(
      <OverviewPanel
        go={vi.fn()}
        access={{
          superAdmin: false,
          permissions: [
            "dashboard.expenses_summary.read",
            "dashboard.expenses_by_category.read",
          ],
        }}
      />,
    );

    await screen.findByText("₹1,250.50");
    await screen.findByText("Rent");

    fireEvent.change(screen.getByLabelText("Dashboard month"), {
      target: { value: "9" },
    });

    await waitFor(() => {
      expect(expensesSummary).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-09$/),
      );
      expect(expensesByCategory).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-09$/),
      );
    });
    expect(await screen.findByText("Hosting")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Dashboard year"), {
      target: { value: "2025" },
    });

    await waitFor(() => {
      expect(expensesSummary).toHaveBeenCalledWith("2025-09");
      expect(expensesByCategory).toHaveBeenCalledWith("2025-09");
    });
    expect(
      await screen.findByText("No expenses recorded for this period."),
    ).toBeInTheDocument();
  });

  it("hides finance cards without their dashboard permissions", async () => {
    render(
      <OverviewPanel
        go={vi.fn()}
        access={{ superAdmin: false, permissions: ["services.read"] }}
      />,
    );

    expect(await screen.findByText("Services")).toBeInTheDocument();
    expect(screen.queryByTestId("expenses-summary-card")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("expenses-by-category-card"),
    ).not.toBeInTheDocument();
    expect(expensesSummary).not.toHaveBeenCalled();
    expect(expensesByCategory).not.toHaveBeenCalled();
  });

  it("keeps existing cards permission-scoped independently", async () => {
    render(
      <OverviewPanel
        go={vi.fn()}
        access={{
          superAdmin: false,
          permissions: [
            "leads.read",
            "dashboard.expenses_summary.read",
            "dashboard.expenses_by_category.read",
          ],
        }}
      />,
    );

    expect(await screen.findByText("Leads")).toBeInTheDocument();
    expect(screen.getByTestId("expenses-summary-card")).toBeInTheDocument();
    expect(screen.getByTestId("expenses-by-category-card")).toBeInTheDocument();
    expect(screen.queryByText("Services")).not.toBeInTheDocument();
    expect(screen.queryByText("Job openings")).not.toBeInTheDocument();
  });

  it("does not break other cards when a finance card fails", async () => {
    expensesSummary.mockRejectedValue(new Error("summary boom"));
    expensesByCategory.mockRejectedValue(new Error("category boom"));

    render(
      <OverviewPanel
        go={vi.fn()}
        access={{
          superAdmin: false,
          permissions: [
            "services.read",
            "dashboard.expenses_summary.read",
            "dashboard.expenses_by_category.read",
          ],
        }}
      />,
    );

    expect(await screen.findByText("Services")).toBeInTheDocument();
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(await screen.findByText("summary boom")).toBeInTheDocument();
    expect(await screen.findByText("category boom")).toBeInTheDocument();
  });
});
