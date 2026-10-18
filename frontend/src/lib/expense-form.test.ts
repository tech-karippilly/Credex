import { describe, expect, it } from "vitest";
import {
  clampPage,
  dateRangeError,
  formatAmountInput,
  formatLedgerDate,
  localCalendarDate,
  parseExpenseAmount,
  receiptFileError,
} from "./expense-form";

describe("expense form helpers", () => {
  it("uses the local calendar date", () => {
    expect(localCalendarDate(new Date(2026, 9, 11, 1, 30))).toBe("2026-10-11");
  });

  it("formats a stored date without shifting the calendar day", () => {
    expect(formatLedgerDate("2026-10-11")).toContain("2026");
    expect(formatLedgerDate("2026-10-11")).toContain("11");
  });

  it("rejects an inverted date range", () => {
    expect(dateRangeError("2026-10-31", "2026-10-01")).toBe(
      "From date cannot be later than To date.",
    );
    expect(dateRangeError("2026-10-01", "2026-10-31")).toBeNull();
    expect(dateRangeError("", "2026-10-31")).toBeNull();
  });

  it("formats stored amounts for the edit form without rounding drift", () => {
    expect(formatAmountInput(10.5)).toBe("10.50");
    expect(formatAmountInput(19.99)).toBe("19.99");
    expect(formatAmountInput(100)).toBe("100");
  });

  it("parses positive amounts with at most 2 decimal places into exact rupees", () => {
    expect(parseExpenseAmount("10.50")).toEqual({ ok: true, amount: 10.5 });
    expect(parseExpenseAmount("19.99")).toEqual({ ok: true, amount: 19.99 });
    expect(parseExpenseAmount("0")).toEqual({
      ok: false,
      message: "Amount must be greater than zero.",
    });
    expect(parseExpenseAmount("1.005").ok).toBe(false);
    expect(parseExpenseAmount("").ok).toBe(false);
  });

  it("rejects unsupported or oversized receipts", () => {
    expect(receiptFileError({ name: "notes.gif", type: "image/gif", size: 100 })).toMatch(
      /JPEG, PNG, or PDF/,
    );
    expect(
      receiptFileError({ name: "scan.pdf", type: "application/pdf", size: 10 * 1024 * 1024 + 1 }),
    ).toMatch(/10 MB/);
    expect(receiptFileError({ name: "scan.pdf", type: "application/pdf", size: 20 })).toBeNull();
  });

  it("moves back to the last page when the current page is no longer valid", () => {
    expect(clampPage(3, 2)).toBe(2);
    expect(clampPage(1, 0)).toBe(1);
  });
});
