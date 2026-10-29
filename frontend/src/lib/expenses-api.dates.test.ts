import { describe, expect, it } from "vitest";
import { expenseInvoiceDate, type Expense } from "./expenses-api";

describe("expenseInvoiceDate", () => {
  it("prefers invoiceDate and falls back to legacy date", () => {
    expect(
      expenseInvoiceDate({
        invoiceDate: "2026-09-15",
        date: "2026-01-01",
      } as Pick<Expense, "invoiceDate" | "date">),
    ).toBe("2026-09-15");

    expect(
      expenseInvoiceDate({
        invoiceDate: "",
        date: "2026-01-01",
      } as Pick<Expense, "invoiceDate" | "date">),
    ).toBe("2026-01-01");
  });
});
