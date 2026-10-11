import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Expense, ExpenseListQuery, ExpenseListResult } from "@/lib/expenses-api";
import { ExpensesPanel } from "./finance";

const { list, listCategories, create, update, uploadReceipt, deleteReceipt, deleteExpense } = vi.hoisted(() => ({
  list: vi.fn(),
  listCategories: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  uploadReceipt: vi.fn(),
  deleteReceipt: vi.fn(),
  deleteExpense: vi.fn(),
}));

vi.mock("@/lib/expenses-api", () => ({
  expensesApi: {
    list,
    listCategories,
    create,
    update,
    uploadReceipt,
    deleteReceipt,
    delete: deleteExpense,
  },
}));

const server: Expense = {
  id: "exp-1",
  expenseName: "AWS hosting",
  categoryId: "cat-server",
  category: { id: "cat-server", name: "Server" },
  paidBy: "Company account",
  amount: 100,
  currency: "INR",
  date: "2026-10-08",
  receipt: null,
  notes: "October",
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
};

function listResult(overrides: Partial<ExpenseListResult> = {}): ExpenseListResult {
  return {
    items: [server],
    totalAmount: 15000,
    pagination: { page: 1, limit: 20, total: 25, totalPages: 2 },
    ...overrides,
  };
}

function calls(): ExpenseListQuery[] {
  return list.mock.calls.map((call) => call[0] as ExpenseListQuery);
}

describe("ExpensesPanel", () => {
  beforeEach(() => {
    list.mockReset();
    listCategories.mockReset();
    create.mockReset();
    update.mockReset();
    uploadReceipt.mockReset();
    deleteReceipt.mockReset();
    deleteExpense.mockReset();
    listCategories.mockResolvedValue([{ id: "cat-server", name: "Server", order: 1 }]);
    list.mockImplementation(async (query: ExpenseListQuery) => {
      if (query.page === 2) {
        return listResult({
          items: [{ ...server, id: "exp-2", expenseName: "Domain renewal", amount: 200 }],
          pagination: { page: 2, limit: query.limit ?? 20, total: 25, totalPages: 2 },
        });
      }
      return listResult({
        pagination: { page: query.page ?? 1, limit: query.limit ?? 20, total: 25, totalPages: 2 },
      });
    });
  });

  it("lists the first page and shows the filtered total from the API", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);

    expect(await screen.findByRole("heading", { name: "Expenses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Expense" })).toBeInTheDocument();
    expect(await screen.findByText("AWS hosting")).toBeInTheDocument();
    expect(screen.getByText("25 expense records match the current filters.")).toBeInTheDocument();
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(calls()[0]).toMatchObject({ page: 1, limit: 20 });
  });

  it("requests the next page and a new page size without dropping filters", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-server" } });
    await waitFor(() => {
      expect(calls().some((query) => query.categoryId === "cat-server" && query.page === 1)).toBe(
        true,
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Domain renewal")).toBeInTheDocument();
    expect(calls().at(-1)).toMatchObject({ page: 2, categoryId: "cat-server", limit: 20 });

    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "50" } });
    await waitFor(() => {
      expect(calls().at(-1)).toMatchObject({ page: 1, limit: 50, categoryId: "cat-server" });
    });
  });

  it("applies a date range with the category filter and clears both", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByText("From date cannot be later than To date.")).toBeInTheDocument();
    expect(calls().every((query) => !query.from)).toBe(true);

    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-server" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      expect(calls().at(-1)).toMatchObject({
        from: "2026-10-31",
        to: "2026-10-31",
        categoryId: "cat-server",
        page: 1,
        limit: 20,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      const latest = calls().at(-1);
      expect(latest?.from).toBeUndefined();
      expect(latest?.to).toBeUndefined();
      expect(latest?.categoryId).toBeUndefined();
      expect(latest?.page).toBe(1);
    });
  });

  it("blocks an invalid expense and does not call the API", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    expect(screen.getByRole("dialog", { name: "Add Expense" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    expect(screen.getByText("Expense name is required.")).toBeInTheDocument();
    expect(screen.getByText("Category is required.")).toBeInTheDocument();
    expect(screen.getByText("Paid by is required.")).toBeInTheDocument();
    expect(screen.getByText("Amount is required.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves a valid expense and keeps it when the receipt upload fails", async () => {
    create.mockResolvedValue(server);
    uploadReceipt.mockRejectedValue(new ApiError(500, "Failed to upload receipt"));
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.change(screen.getByLabelText("Expense name *"), {
      target: { value: "Domain renewal" },
    });
    fireEvent.change(screen.getByLabelText("Category *"), { target: { value: "cat-server" } });
    fireEvent.change(screen.getByLabelText("Paid by *"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "10.50" } });
    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["%PDF"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        expenseName: "Domain renewal",
        categoryId: "cat-server",
        paidBy: "Asha",
        amount: 10.5,
      }),
    );
    await waitFor(() => expect(uploadReceipt).toHaveBeenCalledWith("exp-1", expect.any(File)));
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(await screen.findByText(/kept without a receipt/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rejects an unsupported receipt before creating an expense", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");
    fireEvent.click(screen.getByRole("button", { name: "Add Expense" }));
    fireEvent.change(screen.getByLabelText("Expense name *"), {
      target: { value: "Domain renewal" },
    });
    fireEvent.change(screen.getByLabelText("Category *"), { target: { value: "cat-server" } });
    fireEvent.change(screen.getByLabelText("Paid by *"), { target: { value: "Asha" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["GIF"], "anim.gif", { type: "image/gif" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expense" }));

    expect(await screen.findByText(/JPEG, PNG, or PDF/)).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows an error and retry when the list request fails", async () => {
    list.mockRejectedValueOnce(new ApiError(500, "Expenses are unavailable"));
    render(<ExpensesPanel onVoucher={() => undefined} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Expenses are unavailable");
    expect(screen.queryByText("No expenses yet.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("AWS hosting")).toBeInTheDocument();
  });

  it("updates an expense in place and keeps the current page and filters", async () => {
    listCategories.mockResolvedValue([
      { id: "cat-server", name: "Server", order: 1 },
      { id: "cat-domain", name: "Domain", order: 2 },
    ]);
    update.mockResolvedValue({ ...server, id: "exp-2", expenseName: "Domain renewal updated" });
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-server" } });
    await waitFor(() => {
      expect(calls().some((query) => query.categoryId === "cat-server" && query.page === 1)).toBe(true);
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Domain renewal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    expect(screen.getByRole("dialog", { name: "Edit Expense" })).toBeInTheDocument();
    expect(screen.getByLabelText("Expense name *")).toHaveValue("Domain renewal");
    expect(screen.getByLabelText("Amount (₹) *")).toHaveValue("200");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-10-08");
    expect(screen.getByLabelText("Notes")).toHaveValue("October");

    fireEvent.change(screen.getByLabelText("Expense name *"), { target: { value: "Domain renewal updated" } });
    fireEvent.change(screen.getByLabelText("Category *"), { target: { value: "cat-domain" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "250.25" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-10-11" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Renewed early" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("exp-2", {
      expenseName: "Domain renewal updated",
      categoryId: "cat-domain",
      paidBy: "Company account",
      amount: 250.25,
      date: "2026-10-11",
      notes: "Renewed early",
    });
    expect(create).not.toHaveBeenCalled();
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(uploadReceipt).not.toHaveBeenCalled();
    expect(deleteReceipt).not.toHaveBeenCalled();
    expect(await screen.findByText("Expense updated.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls().at(-1)).toMatchObject({ page: 2, limit: 20, categoryId: "cat-server" });
  });

  it("replaces a receipt only after the expense update succeeds", async () => {
    const withReceipt = {
      ...server,
      receipt: {
        url: "https://files.example/receipt.pdf",
        publicId: "receipt-1",
        fileName: "october.pdf",
        mimeType: "application/pdf",
      },
    };
    list.mockResolvedValue(listResult({ items: [withReceipt] }));
    update.mockResolvedValue(withReceipt);
    uploadReceipt.mockResolvedValue(withReceipt);
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    expect(screen.getByText("Current receipt: october.pdf")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["%PDF"], "november.pdf", { type: "application/pdf" })] },
    });
    expect(screen.getByText("This file replaces october.pdf.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(uploadReceipt).toHaveBeenCalledWith("exp-1", expect.any(File)));
    expect(update).toHaveBeenCalledTimes(1);
    expect(deleteReceipt).not.toHaveBeenCalled();
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("removes a receipt without deleting the expense", async () => {
    const withReceipt = {
      ...server,
      receipt: {
        url: "https://files.example/receipt.pdf",
        publicId: "receipt-1",
        fileName: "october.pdf",
        mimeType: "application/pdf",
      },
    };
    list.mockResolvedValue(listResult({ items: [withReceipt] }));
    update.mockResolvedValue({ ...withReceipt, receipt: null });
    deleteReceipt.mockResolvedValue({ ...withReceipt, receipt: null });
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove receipt" }));
    expect(screen.getByText(/will be removed when you save/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(deleteReceipt).toHaveBeenCalledWith("exp-1"));
    expect(uploadReceipt).not.toHaveBeenCalled();
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the saved expense when receipt replacement fails", async () => {
    update.mockResolvedValue(server);
    uploadReceipt.mockRejectedValue(new ApiError(500, "Failed to upload receipt"));
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    fireEvent.change(screen.getByLabelText("Receipt"), {
      target: { files: [new File(["%PDF"], "receipt.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText(/receipt could not be replaced/)).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels editing without saving", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    fireEvent.change(screen.getByLabelText("Expense name *"), { target: { value: "Changed name" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText("AWS hosting")).toBeInTheDocument();
  });

  it("shows field errors for an invalid edit and does not call the API", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    fireEvent.change(screen.getByLabelText("Expense name *"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByText("Expense name is required.")).toBeInTheDocument();
    expect(screen.getByText("Amount must be greater than zero.")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Edit Expense" })).toBeInTheDocument();
  });

  it("keeps the edit form open when the update fails", async () => {
    update.mockRejectedValue(new ApiError(500, "Could not update expense."));
    render(<ExpensesPanel onVoucher={() => undefined} />);
    await screen.findByText("AWS hosting");

    fireEvent.click(screen.getByRole("button", { name: "Edit expense" }));
    fireEvent.change(screen.getByLabelText("Expense name *"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not update expense.");
    expect(create).not.toHaveBeenCalled();
    expect(deleteExpense).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Edit Expense" })).toBeInTheDocument();
  });
});
