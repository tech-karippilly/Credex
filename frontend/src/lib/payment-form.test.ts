import { describe, expect, it } from "vitest";
import { allocationError, defaultAllocationAmount, paymentAmountFromAllocations, summarizeAllocations, validatePaymentForm } from "./payment-form";

describe("payment allocation summary", () => {
  it("sums selected vouchers into the payment amount", () => {
    expect(paymentAmountFromAllocations([
      { amount: "20000" },
      { amount: "15000" },
      { amount: "10000" },
    ])).toBe("45000");
    expect(defaultAllocationAmount({ outstandingAmount: 20000, availableToAllocate: 15000 })).toBe("15000");
    expect(paymentAmountFromAllocations([])).toBe("0");
  });

  it("shows a fully allocated cheque and a zero remainder", () => {
    const summary = summarizeAllocations("50000", [
      { voucherId: "v1", amount: "20000", availableToAllocate: 20000 },
      { voucherId: "v2", amount: "15000", availableToAllocate: 15000 },
      { voucherId: "v3", amount: "15000", availableToAllocate: 15000 },
    ]);

    expect(summary.allocated).toBe(50000);
    expect(summary.unallocated).toBe(0);
    expect(allocationError(summary)).toBeNull();
  });

  it("rejects a payment amount that is not the allocated total", () => {
    const summary = summarizeAllocations("50000", [
      { voucherId: "v1", amount: "20000", availableToAllocate: 40000 },
    ]);

    expect(summary.allocated).toBe(20000);
    expect(summary.unallocated).toBe(30000);
    expect(allocationError(summary)).toMatch(/equal the total allocated/i);
  });

  it("rejects totals above the payment or a voucher balance", () => {
    const overPayment = summarizeAllocations("100", [
      { voucherId: "v1", amount: "60", availableToAllocate: 100 },
      { voucherId: "v2", amount: "50", availableToAllocate: 100 },
    ]);
    const overVoucher = summarizeAllocations("100", [
      { voucherId: "v1", amount: "80", availableToAllocate: 40 },
    ]);

    expect(overPayment.exceedsPayment).toBe(true);
    expect(allocationError(overPayment)).toMatch(/payment amount/i);
    expect(overVoucher.exceedsVoucher).toBe(true);
    expect(allocationError(overVoucher)).toMatch(/voucher balance/i);
  });
});

describe("payment form validation", () => {
  const base = {
    paymentDate: "2026-10-11",
    amount: "1500",
    payee: "Vendor",
    sourceAccount: "",
    chequeNumber: "",
    chequeDate: "",
    transferMethod: "",
    locked: false,
    allocations: [],
    summary: summarizeAllocations("1500", []),
  };

  it("requires cheque number, date, and issuing account", () => {
    const errors = validatePaymentForm({ ...base, paymentMethod: "CHEQUE" });
    expect(errors.chequeNumber).toMatch(/cheque number/i);
    expect(errors.chequeDate).toMatch(/cheque date/i);
    expect(errors.sourceAccount).toMatch(/account/i);
  });

  it("requires transfer method and source account for a bank transfer", () => {
    const errors = validatePaymentForm({ ...base, paymentMethod: "BANK_TRANSFER" });
    expect(errors.transferMethod).toMatch(/transfer method/i);
    expect(errors.sourceAccount).toMatch(/account/i);
    expect(errors.chequeNumber).toBeUndefined();
  });

  it("accepts a partial allocation when the payment amount equals that allocation", () => {
    const allocations = [{ voucherId: "v1", amount: "500", availableToAllocate: 2000 }];
    const errors = validatePaymentForm({
      ...base,
      paymentMethod: "CASH",
      amount: "500",
      allocations,
      summary: summarizeAllocations("500", allocations),
    });
    expect(errors).toEqual({});
  });

  it("rejects an allocation above the payment amount", () => {
    const allocations = [{ voucherId: "v1", amount: "2000", availableToAllocate: 5000 }];
    const errors = validatePaymentForm({
      ...base,
      paymentMethod: "CASH",
      allocations,
      summary: summarizeAllocations("1500", allocations),
    });
    expect(errors.allocations).toMatch(/payment amount/i);
  });
});
