import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Expense } from "@/lib/expenses-api";
import type { Voucher, VoucherDetail } from "@/lib/vouchers-api";
import { VouchersPanel } from "./finance";

const {
  list,
  create,
  update,
  uploadDocument,
  deleteVoucher,
  get,
  listCategories,
  listExpenses,
} = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  uploadDocument: vi.fn(),
  deleteVoucher: vi.fn(),
  get: vi.fn(),
  listCategories: vi.fn(),
  listExpenses: vi.fn(),
}));

vi.mock("@/lib/vouchers-api", () => ({
  vouchersApi: {
    list,
    create,
    update,
    uploadDocument,
    delete: deleteVoucher,
    get,
    updateStatus: vi.fn(),
    deleteDocument: vi.fn(),
    sendEmail: vi.fn(),
    sendWhatsapp: vi.fn(),
  },
}));

vi.mock("@/lib/expenses-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/expenses-api")>("@/lib/expenses-api");
  return {
    ...actual,
    expensesApi: {
      list: listExpenses,
      listCategories,
    },
  };
});

const expense: Expense = {
  id: "exp-1",
  expenseName: "AWS hosting",
  categoryId: "cat-server",
  category: { id: "cat-server", name: "Server" },
  paidBy: "Vishnu KV",
  amount: 5000,
  currency: "INR",
  date: "2026-10-08",
  invoiceDate: "2026-10-08",
  receivedDate: null,
  receipt: null,
  notes: "",
  voucherStatus: "NOT_VOUCHERED",
  voucheredAmount: 0,
  remainingEligibleAmount: 5000,
  vouchers: [],
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
};

const draftVoucher: Voucher = {
  id: "v-1",
  voucherNumber: "VCH-2026-000001",
  voucherDate: "2026-10-08",
  voucherType: "PAYMENT",
  title: "AWS Hosting Payment",
  description: "October hosting",
  paidBy: "Vishnu KV",
  payee: "AWS",
  amount: 5000,
  amountPaid: 0,
  outstandingAmount: 5000,
  availableToAllocate: 5000,
  settlementStatus: "UNPAID",
  currency: "INR",
  paymentMode: "BANK_TRANSFER",
  categoryId: "cat-server",
  category: { id: "cat-server", name: "Server" },
  expenseId: "exp-1",
  expense: { id: "exp-1", expenseName: "AWS hosting", amount: 5000, invoiceDate: "2026-10-08" },
  referenceNumber: "UTR123",
  notes: "Monthly",
  document: {
    url: "https://files.example/voucher.pdf",
    publicId: "doc-1",
    fileName: "voucher.pdf",
    mimeType: "application/pdf",
  },
  status: "DRAFT",
  createdAt: "2026-10-08T00:00:00.000Z",
  updatedAt: "2026-10-08T00:00:00.000Z",
};

const completedVoucher: Voucher = {
  ...draftVoucher,
  id: "v-2",
  voucherNumber: "VCH-2026-000002",
  title: "Completed payment",
  status: "COMPLETED",
  expenseId: null,
  expense: null,
  document: null,
};

const draftDetail: VoucherDetail = {
  ...draftVoucher,
  amountReserved: 0,
  expense: {
    id: "exp-1",
    expenseName: "AWS hosting",
    amount: 5000,
    invoiceDate: "2026-10-08",
    paidBy: "Vishnu KV",
    category: { id: "cat-server", name: "Server" },
    notes: "",
    receivedDate: null,
    receipt: null,
  },
  payments: [],
  deliveryAttempts: [],
};

describe("VouchersPanel editing", () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    update.mockReset();
    uploadDocument.mockReset();
    deleteVoucher.mockReset();
    get.mockReset();
    listCategories.mockReset();
    listExpenses.mockReset();
    list.mockResolvedValue({
      items: [draftVoucher, completedVoucher],
      settlementCounts: {
        unpaid: 2,
        partiallyPaid: 0,
        paid: 0,
        totalOutstandingAmount: 10000,
      },
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    get.mockResolvedValue(draftDetail);
    listCategories.mockResolvedValue([
      { id: "cat-server", name: "Server", order: 1 },
      { id: "cat-domain", name: "Domain", order: 2 },
    ]);
    listExpenses.mockResolvedValue({
      items: [
        expense,
        {
          ...expense,
          id: "exp-2",
          expenseName: "Domain renewal",
          amount: 1200,
          remainingEligibleAmount: 1200,
        },
      ],
      totalAmount: 6200,
      voucherCounts: { all: 2, notVouchered: 2, vouchered: 0 },
      pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
    });
    vi.spyOn(window, "open").mockReturnValue({
      document: { write: () => undefined, close: () => undefined },
    } as unknown as Window);
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
  });

  it("edits a draft voucher without creating a duplicate or changing its number and status", async () => {
    update.mockResolvedValue({ ...draftVoucher, title: "Updated hosting" });
    render(<VouchersPanel draft={null} />);
    expect(await screen.findByText("VCH-2026-000001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vouchers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Voucher" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Voucher status"), { target: { value: "DRAFT" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(await screen.findByText("VCH-2026-000001")).toBeInTheDocument();
    await waitFor(() => {
      expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT", page: 1, limit: 20 }));
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    expect(screen.getByRole("heading", { name: "Edit Voucher" })).toBeInTheDocument();
    expect(screen.getByText(/stays the same/)).toHaveTextContent("VCH-2026-000001");
    expect(screen.getByText(/does not change the status/)).toBeInTheDocument();
    expect(screen.getByLabelText("Voucher date *")).toHaveValue("2026-10-08");
    expect(screen.getByLabelText("Title *")).toHaveValue("AWS Hosting Payment");
    expect(screen.getByLabelText("Payee *")).toHaveValue("AWS");
    expect(screen.getByLabelText("Amount (₹) *")).toHaveValue("5000");
    expect(screen.getByLabelText("Payment method *")).toHaveValue("BANK_TRANSFER");
    expect(screen.getByLabelText("Transaction reference / UTR")).toHaveValue("UTR123");
    expect(screen.getByLabelText("Notes")).toHaveValue("Monthly");
    expect(screen.getByLabelText("Expense")).toHaveValue("exp-1");
    expect(screen.getByText("Current document: voucher.pdf")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Voucher date *"), { target: { value: "2026-10-09" } });
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Updated hosting" } });
    fireEvent.change(screen.getByLabelText("Payee *"), { target: { value: "Amazon" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "5200.50" } });
    fireEvent.change(screen.getByLabelText("Payment method *"), { target: { value: "UPI" } });
    fireEvent.change(screen.getByLabelText("Reference number"), { target: { value: "UTR999" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Edited note" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-domain" } });
    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "exp-2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("v-1", {
      voucherDate: "2026-10-09",
      voucherType: "PAYMENT",
      title: "Updated hosting",
      description: "October hosting",
      paidBy: "Vishnu KV",
      payee: "Amazon",
      amount: 5200.5,
      paymentMode: "UPI",
      referenceNumber: "UTR999",
      notes: "Edited note",
      categoryId: "cat-domain",
      expenseId: "exp-2",
    });
    const payload = update.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("voucherNumber");
    expect(create).not.toHaveBeenCalled();
    expect(uploadDocument).not.toHaveBeenCalled();
    expect(deleteVoucher).not.toHaveBeenCalled();
    expect(await screen.findByText("Voucher VCH-2026-000001 updated.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(list.mock.calls.at(-1)?.[0]).toMatchObject({ status: "DRAFT" });
  });

  it("keeps a linked expense that is outside the loaded expense list", async () => {
    listExpenses.mockResolvedValue({
      items: [],
      totalAmount: 0,
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });
    update.mockResolvedValue(draftVoucher);
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    expect(screen.getByRole("option", { name: "AWS hosting" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][1]).toMatchObject({ expenseId: "exp-1", categoryId: "cat-server" });
    expect(create).not.toHaveBeenCalled();
  });

  it("clears a linked expense only when the administrator chooses none", async () => {
    update.mockResolvedValue({ ...draftVoucher, expenseId: null, expense: null });
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    fireEvent.change(screen.getByLabelText("Expense"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][1]).toMatchObject({ expenseId: null });
    expect(create).not.toHaveBeenCalled();
  });

  it("cancels editing without saving", async () => {
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Not saved" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Title *")).not.toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("shows field errors for invalid values and does not call the API", async () => {
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "1.005" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(screen.getByText(/up to 2 decimal places/)).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Edit Voucher" })).toBeInTheDocument();
  });

  it("keeps the edit form open when the update fails", async () => {
    update.mockRejectedValue(new ApiError(400, "Voucher update was rejected"));
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Updated hosting" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Voucher update was rejected");
    expect(create).not.toHaveBeenCalled();
    expect(deleteVoucher).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Edit Voucher" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title *")).toHaveValue("Updated hosting");
  });

  it("does not delete the voucher when a replacement document fails", async () => {
    update.mockResolvedValue(draftVoucher);
    uploadDocument.mockRejectedValue(new ApiError(500, "Failed to upload document"));
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[0]);
    fireEvent.change(screen.getByLabelText("Supporting document"), {
      target: { files: [new File(["%PDF"], "replacement.pdf", { type: "application/pdf" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText(/was updated, but the document could not be uploaded/)).toBeInTheDocument();
    expect(update).toHaveBeenCalledTimes(1);
    expect(uploadDocument).toHaveBeenCalledWith("v-1", expect.any(File));
    expect(deleteVoucher).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("edits a completed voucher without sending a status change", async () => {
    update.mockResolvedValue(completedVoucher);
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000002");
    fireEvent.click(screen.getAllByRole("button", { name: "Edit voucher" })[1]);

    expect(screen.getByText(/stays the same/)).toHaveTextContent("VCH-2026-000002");
    expect(screen.getByText(/Status:/)).toHaveTextContent("Completed");
    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Adjusted title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith("v-2", expect.any(Object)));
    const payload = update.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.title).toBe("Adjusted title");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("voucherNumber");
    expect(create).not.toHaveBeenCalled();
  });

  it("applies date, type, method, and search together, keeps them on the next page, then clears them", async () => {
    list.mockResolvedValue({
      items: [draftVoucher],
      settlementCounts: {
        unpaid: 1,
        partiallyPaid: 0,
        paid: 0,
        totalOutstandingAmount: 5000,
      },
      pagination: { page: 1, limit: 20, total: 40, totalPages: 2 },
    });
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");

    fireEvent.change(screen.getByLabelText("From voucher date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("To voucher date"), { target: { value: "2026-10-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByText("From date cannot be later than To date.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("From voucher date"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("To voucher date"), { target: { value: "2026-10-31" } });
    fireEvent.change(screen.getByLabelText("Voucher type"), { target: { value: "PAYMENT" } });
    fireEvent.change(screen.getByLabelText("Voucher status"), { target: { value: "COMPLETED" } });
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "CHEQUE" } });
    fireEvent.change(screen.getByLabelText("Payee or reference"), { target: { value: "AWS" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({
      from: "2026-10-01",
      to: "2026-10-31",
      voucherType: "PAYMENT",
      status: "COMPLETED",
      paymentMode: "CHEQUE",
      search: "AWS",
      page: 1,
      limit: 20,
    })));

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(list).toHaveBeenCalledWith(expect.objectContaining({
      from: "2026-10-01",
      paymentMode: "CHEQUE",
      search: "AWS",
      page: 2,
      limit: 20,
    })));

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      const latest = list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(latest.page).toBe(1);
      expect(latest.from).toBeUndefined();
      expect(latest.to).toBeUndefined();
      expect(latest.voucherType).toBeUndefined();
      expect(latest.status).toBeUndefined();
      expect(latest.paymentMode).toBeUndefined();
      expect(latest.search).toBeUndefined();
    });
  });

  it("opens add voucher on the same screen and records a cheque reference without creating payment fields the voucher API does not store", async () => {
    create.mockResolvedValue({ ...draftVoucher, voucherNumber: "VCH-2026-000009" });
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.click(screen.getByRole("button", { name: "Add Voucher" }));

    expect(screen.getByRole("dialog", { name: "Add Voucher" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payment method *"), { target: { value: "CHEQUE" } });
    expect(screen.getByLabelText("Cheque number")).toBeInTheDocument();
    expect(screen.getByText(/issued cheque is not treated as cleared/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Cheque date *")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title *"), { target: { value: "Vendor cheque" } });
    fireEvent.change(screen.getByLabelText("Paid by *"), { target: { value: "Vishnu KV" } });
    fireEvent.change(screen.getByLabelText("Payee *"), { target: { value: "Vendor" } });
    fireEvent.change(screen.getByLabelText("Amount (₹) *"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Cheque number"), { target: { value: "CHQ-44" } });
    fireEvent.click(screen.getByRole("button", { name: "Save voucher" }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    const payload = create.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      title: "Vendor cheque",
      payee: "Vendor",
      amount: 1500,
      paymentMode: "CHEQUE",
      referenceNumber: "CHQ-44",
      status: "COMPLETED",
    });
    expect(payload).not.toHaveProperty("voucherNumber");
    expect(payload).not.toHaveProperty("chequeDate");
    expect(await screen.findByText("Voucher VCH-2026-000009 created.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides delete and cancel when a voucher already has payment allocations", async () => {
    list.mockResolvedValue({
      items: [{
        ...draftVoucher,
        amountPaid: 1000,
        outstandingAmount: 4000,
        availableToAllocate: 4000,
        settlementStatus: "PARTIALLY_PAID",
      }],
      settlementCounts: {
        unpaid: 0,
        partiallyPaid: 1,
        paid: 0,
        totalOutstandingAmount: 4000,
      },
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    render(<VouchersPanel draft={null} />);
    expect((await screen.findAllByText("Partially paid")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Expense: AWS hosting")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete voucher" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel voucher" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit voucher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View payments" })).not.toBeInTheDocument();
  });

  it("opens full-page details when View details or voucher number is clicked", async () => {
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");

    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[0]);

    await waitFor(() => expect(get).toHaveBeenCalledWith("v-1"));
    expect(await screen.findByRole("button", { name: "Back to vouchers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Voucher summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payment history" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Vouchers" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to vouchers" }));
    expect(await screen.findByRole("heading", { name: "Vouchers" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "VCH-2026-000001" }));
    await waitFor(() => expect(get).toHaveBeenCalledWith("v-1"));
    expect(await screen.findByRole("button", { name: "Back to vouchers" })).toBeInTheDocument();
  });

  it("loads eligible expenses by default and shows settlement summary counts", async () => {
    render(<VouchersPanel draft={null} />);
    expect(await screen.findByText("VCH-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Unpaid vouchers")).toBeInTheDocument();
    expect(screen.getByText("Total outstanding")).toBeInTheDocument();
    await waitFor(() => {
      expect(listExpenses).toHaveBeenCalledWith(
        expect.objectContaining({ eligibleForVoucher: true, limit: 100 }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Voucher" }));
    expect(screen.getByLabelText("Find eligible expenses")).toBeInTheDocument();
    expect(screen.getByLabelText("Expense")).toBeInTheDocument();
  });

  it("filters vouchers by payment settlement status", async () => {
    render(<VouchersPanel draft={null} />);
    await screen.findByText("VCH-2026-000001");
    fireEvent.change(screen.getByLabelText("Payment status"), {
      target: { value: "UNPAID" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => {
      const latest = list.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(latest.settlementStatus).toBe("UNPAID");
    });
  });
});
