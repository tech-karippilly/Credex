import { describe, expect, it } from "vitest";
import { emptyLeadDraft, isSpreadsheetName, validateLeadDraft } from "./leads-form";

describe("lead form helpers", () => {
  it("requires company, contact, and a valid phone", () => {
    const errors = validateLeadDraft(emptyLeadDraft());
    expect(errors.companyName).toBeTruthy();
    expect(errors.contactName).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });

  it("accepts a complete draft", () => {
    expect(
      validateLeadDraft({
        ...emptyLeadDraft(),
        companyName: "Acme",
        contactName: "Priya",
        phone: "+919876543210",
      }),
    ).toEqual({});
  });

  it("rejects .xls spreadsheets in the browser before upload", () => {
    expect(isSpreadsheetName("leads.xls").ok).toBe(false);
    expect(isSpreadsheetName("leads.xlsx").ok).toBe(true);
    expect(isSpreadsheetName("leads.csv").ok).toBe(true);
  });
});
