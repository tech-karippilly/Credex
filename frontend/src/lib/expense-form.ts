const RECEIPT_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

export const EXPENSE_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export type ExpenseAmountResult = { ok: true; amount: number } | { ok: false; message: string };

export function localCalendarDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLedgerDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

export function dateRangeError(from: string, to: string): string | null {
  if (from && to && from > to) {
    return "From date cannot be later than To date.";
  }
  return null;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

export function formatAmountInput(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const paise = Math.round(amount * 100);
  const rupees = Math.trunc(paise / 100);
  const fraction = Math.abs(paise % 100);
  if (fraction === 0) return String(rupees);
  return `${rupees}.${String(fraction).padStart(2, "0")}`;
}

export function parseExpenseAmount(raw: string): ExpenseAmountResult {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Amount is required." };
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return {
      ok: false,
      message: "Enter an amount greater than zero with up to 2 decimal places.",
    };
  }

  const [rupees, fraction = ""] = value.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise < 1) {
    return { ok: false, message: "Amount must be greater than zero." };
  }

  const amount = paise / 100;
  if (Math.round(amount * 100) !== paise) {
    return {
      ok: false,
      message: "Enter an amount greater than zero with up to 2 decimal places.",
    };
  }

  return { ok: true, amount };
}

export function receiptFileError(file: {
  type: string;
  size: number;
  name: string;
}): string | null {
  if (file.size > EXPENSE_RECEIPT_MAX_BYTES) {
    return "Receipt must be 10 MB or smaller.";
  }
  if (file.size <= 0) return "Receipt file is empty.";

  const type = file.type.toLowerCase();
  if (RECEIPT_MIME_TYPES.has(type)) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionAllowed =
    extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "pdf";
  if (!type && extensionAllowed) return null;

  return "Receipt must be a JPEG, PNG, or PDF file.";
}
