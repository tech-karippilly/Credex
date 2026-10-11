import { EXPENSE_RECEIPT_MAX_BYTES, formatAmountInput, parseExpenseAmount } from "./expense-form";

const DOCUMENT_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

export type AllocationDraft = {
  voucherId: string;
  amount: string;
  availableToAllocate: number;
  voucherNumber?: string;
  voucherDate?: string;
  title?: string;
  payee?: string;
  voucherAmount?: number;
  amountPaid?: number;
  outstandingAmount?: number;
};

export type PaymentField =
  | "paymentDate"
  | "amount"
  | "payee"
  | "sourceAccount"
  | "chequeNumber"
  | "chequeDate"
  | "transferMethod"
  | "document"
  | "allocations";

export type AllocationSummary = {
  allocated: number;
  unallocated: number | null;
  exceedsPayment: boolean;
  exceedsVoucher: boolean;
  invalidAmount: boolean;
};

function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

function parseRupees(raw: string): number | null {
  const value = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [rupees, fraction = ""] = value.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise < 1) return null;
  return paise / 100;
}

/** Payment amount equals the sum of allocation amounts. Blank or invalid rows contribute nothing. */
export function paymentAmountFromAllocations(allocations: { amount: string }[]): string {
  if (allocations.length === 0) return "0";
  const paise = allocations.reduce((sum, row) => {
    const parsed = parseRupees(row.amount);
    return sum + (parsed === null ? 0 : toPaise(parsed));
  }, 0);
  return formatAmountInput(paise / 100);
}

/** Default a new row to the outstanding balance that can still be allocated. */
export function defaultAllocationAmount(voucher: {
  outstandingAmount: number;
  availableToAllocate: number;
}): string {
  const paise = Math.min(
    Math.round(voucher.outstandingAmount * 100),
    Math.round(voucher.availableToAllocate * 100),
  );
  if (!Number.isSafeInteger(paise) || paise < 1) return "";
  return formatAmountInput(paise / 100);
}

/** Unallocated remainder applies only when a payment has no voucher allocations. */
export function summarizeAllocations(
  paymentAmountRaw: string,
  allocations: AllocationDraft[],
): AllocationSummary {
  const payment = parseRupees(paymentAmountRaw);
  const parsed = allocations.map((row) => parseRupees(row.amount));
  const invalidAmount = parsed.some((amount) => amount === null);
  const allocatedPaise = parsed.reduce<number>(
    (sum, amount) => sum + (amount === null ? 0 : toPaise(amount)),
    0,
  );
  const paymentPaise = payment === null ? null : toPaise(payment);
  const exceedsVoucher = allocations.some((row, index) => {
    const amount = parsed[index];
    return amount != null && toPaise(amount) > toPaise(row.availableToAllocate);
  });

  return {
    allocated: allocatedPaise / 100,
    unallocated: paymentPaise === null ? null : (paymentPaise - allocatedPaise) / 100,
    exceedsPayment: paymentPaise !== null && allocatedPaise > paymentPaise,
    exceedsVoucher,
    invalidAmount,
  };
}

export function allocationError(summary: AllocationSummary): string | null {
  if (summary.invalidAmount) return "Enter each allocation with up to 2 decimal places.";
  if (summary.exceedsVoucher) return "An allocation exceeds the voucher balance available to allocate.";
  if (summary.exceedsPayment || (summary.unallocated !== null && summary.unallocated < 0)) {
    return "Allocations exceed the payment amount.";
  }
  if (summary.allocated > 0 && summary.unallocated !== null && summary.unallocated !== 0) {
    return "Payment amount must equal the total allocated to the selected vouchers.";
  }
  return null;
}

export function documentFileError(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  if (file.size > EXPENSE_RECEIPT_MAX_BYTES) return "Document must be 10 MB or smaller.";
  if (file.size <= 0) return "Document file is empty.";

  const type = file.type.toLowerCase();
  if (DOCUMENT_MIME_TYPES.has(type)) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionAllowed =
    extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "pdf";
  if (!type && extensionAllowed) return null;

  return "Document must be a JPEG, PNG, or PDF file.";
}

export function validatePaymentForm(input: {
  paymentMethod: string;
  paymentDate: string;
  amount: string;
  payee: string;
  sourceAccount: string;
  chequeNumber: string;
  chequeDate: string;
  transferMethod: string;
  locked: boolean;
  allocations: { voucherId: string }[];
  summary: AllocationSummary;
  documentError?: string | null;
}): Partial<Record<PaymentField, string>> {
  const errors: Partial<Record<PaymentField, string>> = {};

  if (!input.locked) {
    if (!input.paymentDate) errors.paymentDate = "Payment date is required.";
    const amount = parseExpenseAmount(input.amount);
    if (!amount.ok) errors.amount = amount.message;
    if (!input.payee.trim()) errors.payee = "Payee is required.";

    if (input.paymentMethod === "CHEQUE") {
      if (!input.chequeNumber.trim()) errors.chequeNumber = "Cheque number is required.";
      if (!input.chequeDate) errors.chequeDate = "Cheque date is required.";
      if (!input.sourceAccount.trim()) errors.sourceAccount = "Issuing bank or account is required.";
    }

    if (input.paymentMethod === "BANK_TRANSFER") {
      if (!input.transferMethod) errors.transferMethod = "Transfer method is required.";
      if (!input.sourceAccount.trim()) errors.sourceAccount = "Bank or source account is required.";
    }

    if (new Set(input.allocations.map((row) => row.voucherId)).size !== input.allocations.length) {
      errors.allocations = "Each voucher can only be allocated once on this payment.";
    } else if (amount.ok) {
      const message = allocationError(input.summary);
      if (message) errors.allocations = message;
    }
  }

  if (input.documentError) errors.document = input.documentError;
  return errors;
}
