import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { ExpenseFinancialReport, PaymentFinancialReport } from "@/lib/reports-api";
import { ReportsPanel } from "./reports-panel";

const { expenses, vouchers, payments, exportReport, listCategories } = vi.hoisted(() => ({
  expenses: vi.fn(),
  vouchers: vi.fn(),
  payments: vi.fn(),
  exportReport: vi.fn(),
  listCategories: vi.fn(),
}));

vi.mock("@/lib/reports-api", () => ({
  reportsApi: { expenses, vouchers, payments, exportReport },
}));

vi.mock("@/lib/expenses-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/expenses-api")>("@/lib/expenses-api");
  return {
    ...actual,
    expensesApi: { listCategories },
  };
});

function expenseReport(overrides: Partial<ExpenseFinancialReport> = {}): ExpenseFinancialReport {
  return {
    meta: {
      title: "Expense report",
      period: { from: "2026-10-01", to: "2026-10-31", label: "2026-10-01 to 2026-10-31" },
      filters: [{ label: "Expense name", value: "AWS" }],
      generatedAt: "2026-10-11T00:00:00.000Z",
      notes: ["Expense total = sum of expense.amountPaise / 100 for every matching expense. This is recorded spending, not a voucher total or a payment total."],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
    summary: {
      count: 1,
      expenseTotal: 5000,
      byCategory: [{ key: "cat-1", label: "Server", count: 1, amount: 5000 }],
      byDate: [{ key: "2026-10-01", label: "2026-10-01", count: 1, amount: 5000 }],
    },
    items: [
      {
        id: "exp-1",
        date: "2026-10-01",
        invoiceDate: "2026-10-01",
        receivedDate: null,
        expenseName: "AWS",
        categoryId: "cat-1",
        categoryName: "Server",
        paidBy: "Credex",
        amount: 5000,
        receiptAvailable: false,
        receiptFileName: "",
        receiptUrl: null,
        notes: "Hosting",
      },
    ],
    ...overrides,
  };
}

function paymentReport(): PaymentFinancialReport {
  return {
    meta: {
      title: "Payment report",
      period: { from: null, to: null, label: "All dates" },
      filters: [],
      generatedAt: "2026-10-11T00:00:00.000Z",
      notes: ["Cleared / settled amount excludes issued and bounced cheques."],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    },
    summary: {
      count: 1,
      recordedTotal: 1000,
      clearedTotal: 0,
      allocatedTotal: 1000,
      unallocatedTotal: 0,
      byMethod: [{ key: "CHEQUE", label: "Cheque", count: 1, amount: 1000, clearedAmount: 0 }],
      byStatus: [{ key: "ISSUED", label: "Issued", count: 1, amount: 1000 }],
    },
    items: [
      {
        id: "pay-1",
        paymentNumber: "PAY-2026-000001",
        paymentDate: "2026-10-11",
        paymentMethod: "CHEQUE",
        paymentMethodLabel: "Cheque",
        chequeNumber: "CHQ-55",
        chequeDate: "2026-10-11",
        referenceNumber: "",
        payee: "Vendor",
        amount: 1000,
        allocatedAmount: 1000,
        unallocatedAmount: 0,
        status: "ISSUED",
        statusLabel: "Issued",
        countsAsCleared: false,
        voucherReferences: [{ id: "v1", voucherNumber: "VCH-1" }],
      },
    ],
  };
}

describe("ReportsPanel", () => {
  beforeEach(() => {
    expenses.mockReset();
    vouchers.mockReset();
    payments.mockReset();
    exportReport.mockReset();
    listCategories.mockReset();
    listCategories.mockResolvedValue([{ id: "cat-1", name: "Server", order: 1 }]);
    expenses.mockResolvedValue(expenseReport());
    payments.mockResolvedValue(paymentReport());
    exportReport.mockResolvedValue(undefined);
  });

  it("shows the reports page and keeps export disabled until a report exists", () => {
    render(<ReportsPanel />);
    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByText(/Generate and export financial reports/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();
    expect(screen.getByLabelText("Expense category")).toBeInTheDocument();
  });

  it("shows the filters for the selected report type", () => {
    render(<ReportsPanel />);
    fireEvent.change(screen.getByLabelText("Report type"), { target: { value: "vouchers" } });
    expect(screen.getByLabelText("Voucher type")).toBeInTheDocument();
    expect(screen.getByLabelText("Voucher number or reference")).toBeInTheDocument();
    expect(screen.queryByLabelText("Expense category")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Report type"), { target: { value: "payments" } });
    expect(screen.getByLabelText("Cheque number")).toBeInTheDocument();
    expect(screen.getByLabelText("UTR or transaction reference")).toBeInTheDocument();
    expect(screen.queryByLabelText("Voucher type")).not.toBeInTheDocument();
  });

  it("rejects a from date later than the to date before calling the API", () => {
    render(<ReportsPanel />);
    fireEvent.change(screen.getByLabelText("From invoice date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("To invoice date"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(screen.getByRole("alert")).toHaveTextContent("From date cannot be later than To date.");
    expect(expenses).not.toHaveBeenCalled();
  });

  it("generates an expense report and exports the same filters", async () => {
    render(<ReportsPanel />);
    fireEvent.change(screen.getByLabelText("From invoice date"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("To invoice date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Expense name"), { target: { value: "AWS" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));

    expect(await screen.findByText("AWS")).toBeInTheDocument();
    expect(screen.getAllByText("Expense total").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹5,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Reporting period: 1 Oct 2026 to 31 Oct 2026/)).toBeInTheDocument();
    expect(expenses).toHaveBeenCalledWith(expect.objectContaining({
      from: "2026-10-01",
      to: "2026-10-31",
      search: "AWS",
      page: 1,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Export report" }));
    await waitFor(() => expect(exportReport).toHaveBeenCalledWith("expenses", expect.objectContaining({
      from: "2026-10-01",
      search: "AWS",
    })));
    expect(await screen.findByText("Report exported.")).toBeInTheDocument();
  });

  it("hides the generated report when filters change", async () => {
    render(<ReportsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(await screen.findByText("AWS")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Expense name"), { target: { value: "Domain" } });
    expect(screen.queryByText("AWS")).not.toBeInTheDocument();
    expect(screen.getByText(/Filters have changed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export report" })).toBeDisabled();
  });

  it("shows an empty state when nothing matches", async () => {
    expenses.mockResolvedValue(expenseReport({
      summary: { count: 0, expenseTotal: 0, byCategory: [], byDate: [] },
      items: [],
      meta: {
        ...expenseReport().meta,
        filters: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
    }));
    render(<ReportsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(await screen.findByText("No expenses match the selected filters.")).toBeInTheDocument();
    expect(screen.getByText("₹0.00")).toBeInTheDocument();
  });

  it("shows an error and retries generation", async () => {
    expenses.mockRejectedValueOnce(new ApiError(500, "Report failed"));
    render(<ReportsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(await screen.findByText("Report failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("AWS")).toBeInTheDocument();
    expect(expenses).toHaveBeenCalledTimes(2);
  });

  it("keeps payment totals separate from expense totals", async () => {
    render(<ReportsPanel />);
    fireEvent.change(screen.getByLabelText("Report type"), { target: { value: "payments" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate report" }));
    expect(await screen.findByText("Cleared / settled amount")).toBeInTheDocument();
    expect(screen.getByText("Recorded payment total")).toBeInTheDocument();
    expect(screen.getByText("Not cleared")).toBeInTheDocument();
    expect(screen.queryByText("Expense total")).not.toBeInTheDocument();
    expect(screen.queryByText("Voucher total")).not.toBeInTheDocument();
  });
});
