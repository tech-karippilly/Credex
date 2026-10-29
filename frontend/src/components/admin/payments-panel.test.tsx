import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import type { Payment, PaymentListItem, PaymentListParams } from "@/lib/payments-api";
import { PaymentsPanel } from "./payments-panel";

const { list, eligibleVouchers, create, get, update } = vi.hoisted(() => ({
  list: vi.fn(),
  eligibleVouchers: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/payments-api", () => ({
  paymentsApi: {
    list,
    eligibleVouchers,
    create,
    get,
    update,
    updateStatus: vi.fn(),
    uploadDocument: vi.fn(),
    removeDocument: vi.fn(),
  },
}));

const voucher = {
  id: "v1",
  voucherNumber: "VCH-2026-000001",
  title: "Hosting",
  payee: "Vendor",
  voucherDate: "2026-10-11",
  amount: 20000,
  amountPaid: 0,
  outstandingAmount: 20000,
  availableToAllocate: 20000,
  settlementStatus: "UNPAID",
  status: "COMPLETED",
};

function listItem(overrides: Partial<PaymentListItem> = {}): PaymentListItem {
  return {
    id: "pay-1",
    paymentNumber: "PAY-2026-000001",
    paymentMethod: "CHEQUE",
    paymentDate: "2026-10-11",
    amount: 50000,
    allocatedAmount: 20000,
    unallocatedAmount: 30000,
    payee: "Vendor",
    referenceNumber: "",
    chequeNumber: "CHQ-10025",
    status: "ISSUED",
    financiallyLocked: false,
    allowedStatuses: ["PRESENTED", "CLEARED", "CANCELLED"],
    linkedVoucherCount: 1,
    createdAt: "2026-10-11T00:00:00.000Z",
    ...overrides,
  };
}

function paymentRecord(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    paymentNumber: "PAY-2026-000001",
    paymentMethod: "CHEQUE",
    paymentDate: "2026-10-11",
    amount: 50000,
    allocatedAmount: 20000,
    unallocatedAmount: 30000,
    payee: "Vendor",
    sourceAccount: "SBI-001",
    referenceNumber: "",
    chequeNumber: "CHQ-10025",
    chequeDate: "2026-10-11",
    transferMethod: "",
    remarks: "October rent",
    status: "ISSUED",
    allowedStatuses: ["PRESENTED", "CLEARED", "CANCELLED"],
    financiallyLocked: false,
    document: null,
    allocations: [{
      voucherId: "v1",
      voucherNumber: "VCH-2026-000001",
      voucherTitle: "Hosting",
      voucherDate: "2026-10-11",
      payee: "Vendor",
      voucherAmount: 20000,
      amount: 20000,
      amountPaid: 0,
      outstandingAmount: 20000,
      availableToAllocate: 0,
      settlementStatus: "UNPAID",
    }],
    linkedVoucherCount: 1,
    createdBy: { id: "user-1", email: "admin@example.com" },
    audit: [],
    createdAt: "2026-10-11T04:00:00.000Z",
    updatedAt: "2026-10-11T05:00:00.000Z",
    ...overrides,
  };
}

function calls(): PaymentListParams[] {
  return list.mock.calls.map((call) => call[0] as PaymentListParams);
}

describe("PaymentsPanel", () => {
  beforeEach(() => {
    list.mockReset();
    eligibleVouchers.mockReset();
    create.mockReset();
    get.mockReset();
    update.mockReset();
    list.mockImplementation(async (query: PaymentListParams = {}) => ({
      items: query.page === 2 ? [listItem({ id: "pay-2", paymentNumber: "PAY-2026-000002" })] : [listItem()],
      pagination: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total: 25,
        totalPages: Math.max(1, Math.ceil(25 / (query.limit ?? 20))),
      },
    }));
    eligibleVouchers.mockResolvedValue([voucher]);
    get.mockResolvedValue(paymentRecord());
  });

  it("calculates the payment amount from selected vouchers and still allows a standalone amount", async () => {
    eligibleVouchers.mockResolvedValue([
      voucher,
      {
        ...voucher,
        id: "v2",
        voucherNumber: "VCH-2026-000002",
        amount: 15000,
        outstandingAmount: 15000,
        availableToAllocate: 15000,
      },
      {
        ...voucher,
        id: "v3",
        voucherNumber: "VCH-2026-000003",
        amount: 10000,
        outstandingAmount: 10000,
        availableToAllocate: 10000,
      },
    ]);
    render(<PaymentsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Add Payment" }));
    const amount = await screen.findByLabelText("Payment amount (INR) *");
    expect(amount).not.toHaveAttribute("readonly");

    const addButtons = await screen.findAllByRole("button", { name: "Add" });
    fireEvent.click(addButtons[0]);
    expect(screen.getByLabelText("Payment amount (INR) *")).toHaveValue("₹20,000.00");
    expect(screen.getByLabelText("Payment amount (INR) *")).toHaveAttribute("readonly");

    fireEvent.click(addButtons[1]);
    fireEvent.click(addButtons[2]);
    expect(screen.getByLabelText("Payment amount (INR) *")).toHaveValue("₹45,000.00");

    const allocationInputs = screen.getAllByLabelText("Amount to allocate");
    fireEvent.change(allocationInputs[0], { target: { value: "5000" } });
    expect(screen.getByLabelText("Payment amount (INR) *")).toHaveValue("₹30,000.00");
    expect(screen.getByText(/Total allocated:/).parentElement).toHaveTextContent("₹30,000.00");
    expect(screen.getByText(/Unallocated amount:/).parentElement).toHaveTextContent("₹0.00");

    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[2]);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    const resetAmount = screen.getByLabelText("Payment amount (INR) *");
    expect(resetAmount).toHaveValue("0");
    expect(resetAmount).not.toHaveAttribute("readonly");

    fireEvent.change(resetAmount, { target: { value: "1500" } });
    expect(resetAmount).toHaveValue("1500");
  });

  it("switches to bank transfer fields and records one payment", async () => {
    create.mockResolvedValue({
      id: "pay-1",
      paymentNumber: "PAY-2026-000001",
      unallocatedAmount: 1500,
    });
    render(<PaymentsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Add Payment" }));
    await screen.findByLabelText("Cheque number *");

    fireEvent.change(screen.getByLabelText("Payment method *"), { target: { value: "BANK_TRANSFER" } });
    expect(screen.getByLabelText("Transfer method *")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cheque number *")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Transfer status *")).toHaveValue("INITIATED");

    fireEvent.change(screen.getByLabelText("Payment amount (INR) *"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Payee *"), { target: { value: "Vendor" } });
    fireEvent.change(screen.getByLabelText("Bank / source account *"), { target: { value: "SBI-001" } });
    fireEvent.change(screen.getByLabelText("UTR / transaction reference"), { target: { value: "UTR998877" } });
    const save = screen.getByRole("button", { name: "Save payment" });
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: "BANK_TRANSFER",
      status: "INITIATED",
      transferMethod: "NEFT",
      referenceNumber: "UTR998877",
      amount: 1500,
      allocations: [],
    }));
    expect(await screen.findByText(/PAY-2026-000001 recorded/)).toBeInTheDocument();
    expect(screen.getByText(/not applied to a voucher/i)).toBeInTheDocument();
  });

  it("applies filters together, resets the page, and clears them", async () => {
    render(<PaymentsPanel />);
    await screen.findByText("PAY-2026-000001");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("PAY-2026-000002");

    fireEvent.change(screen.getByLabelText("From payment date"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("To payment date"), { target: { value: "2026-10-11" } });
    fireEvent.change(screen.getByLabelText("Payment method"), { target: { value: "CHEQUE" } });
    fireEvent.change(screen.getByLabelText("Payment status"), { target: { value: "ISSUED" } });
    fireEvent.change(screen.getByLabelText("Payee"), { target: { value: "Vendor" } });
    fireEvent.change(screen.getByLabelText("Cheque number"), { target: { value: "CHQ-10025" } });
    fireEvent.change(screen.getByLabelText("UTR or transaction reference"), { target: { value: "UTR1" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    await waitFor(() => {
      expect(calls().at(-1)).toEqual(expect.objectContaining({
        page: 1,
        from: "2026-10-01",
        to: "2026-10-11",
        paymentMethod: "CHEQUE",
        status: "ISSUED",
        payee: "Vendor",
        chequeNumber: "CHQ-10025",
        reference: "UTR1",
      }));
    });

    fireEvent.change(screen.getByLabelText("From payment date"), { target: { value: "2026-10-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByText("From date cannot be later than To date.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      const latest = calls().at(-1);
      expect(latest?.payee).toBeUndefined();
      expect(latest?.chequeNumber).toBeUndefined();
      expect(latest?.reference).toBeUndefined();
      expect(latest?.page).toBe(1);
    });
  });

  it("pages on the server and changes the page size", async () => {
    render(<PaymentsPanel />);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–20 of 25 on this page.")).toBeInTheDocument();
    expect(screen.getByText(/25 payment records match/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2 of 2");
    expect(calls().at(-1)?.page).toBe(2);

    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "50" } });
    await waitFor(() => expect(calls().at(-1)).toEqual(expect.objectContaining({ page: 1, limit: 50 })));
  });

  it("shows an error and retries the listing", async () => {
    list.mockRejectedValueOnce(new ApiError(500, "Payments unavailable"));
    render(<PaymentsPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Payments unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("PAY-2026-000001")).toBeInTheDocument();
  });

  it("edits the existing payment instead of creating another one", async () => {
    update.mockResolvedValue(paymentRecord({ payee: "New vendor" }));
    render(<PaymentsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit PAY-2026-000001" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Payment" });
    expect(dialog).toHaveTextContent("PAY-2026-000001");
    expect(within(dialog).getByLabelText("Cheque number *")).toHaveValue("CHQ-10025");

    fireEvent.change(within(dialog).getByLabelText("Payee *"), { target: { value: "New vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith("pay-1", expect.objectContaining({
      payee: "New vendor",
      chequeNumber: "CHQ-10025",
      amount: 20000,
    }));
    expect(create).not.toHaveBeenCalled();
    expect(await screen.findByText(/PAY-2026-000001 updated/)).toBeInTheDocument();
  });

  it("keeps a posted payment's financial fields unchanged", async () => {
    get.mockResolvedValue(paymentRecord({
      status: "CLEARED",
      financiallyLocked: true,
      allowedStatuses: ["BOUNCED"],
    }));
    update.mockResolvedValue(paymentRecord({ status: "CLEARED", financiallyLocked: true, remarks: "Corrected note" }));
    render(<PaymentsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit PAY-2026-000001" }));
    expect(await screen.findByText(/posted/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Payment amount (INR) *")).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Remarks"), { target: { value: "Corrected note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith("pay-1", { remarks: "Corrected note" }));
    expect(create).not.toHaveBeenCalled();
  });

  it("shows linked vouchers, the cheque, and the unallocated amount", async () => {
    render(<PaymentsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "View PAY-2026-000001" }));
    const dialog = await screen.findByRole("dialog", { name: "PAY-2026-000001" });
    expect(dialog).toHaveTextContent("CHQ-10025");
    expect(within(dialog).getByRole("button", { name: "VCH-2026-000001" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("₹20,000.00");
    expect(dialog).toHaveTextContent("₹30,000.00");
    expect(dialog).toHaveTextContent("Unallocated amount");
  });
});
