import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@/lib/expenses-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/expenses-api")>("@/lib/expenses-api");
  return {
    ...actual,
    expensesApi: {
      list,
      listCategories,
      create,
      update,
      uploadReceipt,
      deleteReceipt,
      delete: deleteExpense,
    },
  };
});

const server: Expense = {
  id: "exp-1",
  expenseName: "AWS hosting",
  categoryId: "cat-server",
  category: { id: "cat-server", name: "Server" },
  paidBy: "Company account",
  amount: 100,
  currency: "INR",
  date: "2026-10-08",
  invoiceDate: "2026-10-08",
  receivedDate: null,
  receipt: null,
  notes: "October",
  voucherStatus: "NOT_VOUCHERED",
  voucheredAmount: 0,
  remainingEligibleAmount: 100,
  vouchers: [],
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
};

const voucheredExpense: Expense = {
  ...server,
  id: "exp-vouchered",
  expenseName: "Office rent",
  voucherStatus: "VOUCHERED",
  voucheredAmount: 100,
  remainingEligibleAmount: 0,
  vouchers: [
    {
      id: "v-1",
      voucherNumber: "VCH-2026-000010",
      amount: 100,
      status: "COMPLETED",
    },
  ],
};

function listResult(overrides: Partial<ExpenseListResult> = {}): ExpenseListResult {
  return {
    items: [server],
    totalAmount: 15000,
    voucherCounts: { all: 25, notVouchered: 20, vouchered: 5 },
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

    fireEvent.change(screen.getByLabelText("From invoice date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("To invoice date"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByText("From date cannot be later than To date.")).toBeInTheDocument();
    expect(calls().every((query) => !query.from)).toBe(true);

    fireEvent.change(screen.getByLabelText("To invoice date"), { target: { value: "2026-10-31" } });
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
        invoiceDate: expect.any(String),
        date: expect.any(String),
        receivedDate: null,
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
    expect(screen.getByLabelText("Invoice date *")).toHaveValue("2026-10-08");
    expect(screen.getByLabelText("Received date")).toHaveValue("");
    expect(screen.getByText(/System entry time/)).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toHaveValue("October");

    fireEvent.change(screen.getByLabelText("Expense name *"), { target: { value: "Domain renewal updated" } });
    fireEvent.change(screen.getByLabelText("Category *"), { target: { value: "cat-domain" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "250.25" } });
    fireEvent.change(screen.getByLabelText("Invoice date *"), { target: { value: "2026-10-11" } });
    fireEvent.change(screen.getByLabelText("Received date"), { target: { value: "2026-10-12" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Renewed early" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("exp-2", {
      expenseName: "Domain renewal updated",
      categoryId: "cat-domain",
      paidBy: "Company account",
      amount: 250.25,
      invoiceDate: "2026-10-11",
      date: "2026-10-11",
      receivedDate: "2026-10-12",
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

  describe("receipt preview", () => {
    const withReceipt = {
      ...server,
      receipt: {
        url: "https://files.example/receipt.pdf",
        publicId: "receipt-1",
        fileName: "october.pdf",
        mimeType: "application/pdf",
      },
    };
    const createObjectURL = vi.fn(() => "blob:expense-receipt");
    const revokeObjectURL = vi.fn();
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      list.mockResolvedValue(listResult({ items: [withReceipt] }));
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
      }));
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL,
        revokeObjectURL,
      });
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    });

    afterEach(() => {
      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it("opens a PDF preview from View Receipt without downloading", async () => {
      render(<ExpensesPanel onVoucher={() => undefined} />);
      await screen.findByText("AWS hosting");

      fireEvent.click(screen.getByRole("button", { name: "View Receipt" }));

      expect(await screen.findByRole("dialog", { name: "Receipt preview" })).toBeInTheDocument();
      expect(await screen.findByTitle("Receipt october.pdf")).toBeInTheDocument();
      expect(clickSpy).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(withReceipt.receipt.url);
    });

    it("downloads from the preview only when Download PDF is clicked", async () => {
      render(<ExpensesPanel onVoucher={() => undefined} />);
      await screen.findByText("AWS hosting");
      fireEvent.click(screen.getByRole("button", { name: "View Receipt" }));
      await screen.findByTitle("Receipt october.pdf");

      fireEvent.click(screen.getByRole("button", { name: /Download PDF/i }));
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("can close and reopen the receipt preview", async () => {
      render(<ExpensesPanel onVoucher={() => undefined} />);
      await screen.findByText("AWS hosting");

      fireEvent.click(screen.getByRole("button", { name: "View Receipt" }));
      expect(await screen.findByRole("dialog", { name: "Receipt preview" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Close/i }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "Receipt preview" })).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "View Receipt" }));
      expect(await screen.findByRole("dialog", { name: "Receipt preview" })).toBeInTheDocument();
      expect(await screen.findByTitle("Receipt october.pdf")).toBeInTheDocument();
    });
  });

  it("shows not-vouchered status, counts, and filters by voucher status", async () => {
    render(<ExpensesPanel onVoucher={() => undefined} />);
    expect(await screen.findByText("AWS hosting")).toBeInTheDocument();
    expect(screen.getAllByText("Not vouchered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("All expenses").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Create voucher" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Voucher status"), {
      target: { value: "VOUCHERED" },
    });
    await waitFor(() => {
      expect(calls().some((query) => query.voucherStatus === "VOUCHERED")).toBe(true);
    });
  });

  it("shows vouchered expenses with a voucher link and hides create voucher when fully vouchered", async () => {
    list.mockResolvedValue(
      listResult({
        items: [voucheredExpense],
        voucherCounts: { all: 1, notVouchered: 0, vouchered: 1 },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    );
    const onOpenVoucher = vi.fn();
    render(<ExpensesPanel onVoucher={() => undefined} onOpenVoucher={onOpenVoucher} />);

    expect(await screen.findByText("Office rent")).toBeInTheDocument();
    expect(screen.getAllByText("Vouchered").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "VCH-2026-000010" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create voucher" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "VCH-2026-000010" }));
    expect(onOpenVoucher).toHaveBeenCalledWith("VCH-2026-000010");
  });
});
