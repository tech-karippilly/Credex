import { describe, expect, it } from "vitest";
import { formatReportPeriod, sameReportFilters, emptyReportFilters } from "./report-form";

describe("report form", () => {
  it("formats an inclusive period and leaves open ends visible", () => {
    expect(formatReportPeriod({ from: "2026-10-01", to: "2026-10-31" })).toBe(
      "1 Oct 2026 to 31 Oct 2026",
    );
    expect(formatReportPeriod({ from: null, to: null })).toBe("All dates");
    expect(formatReportPeriod({ from: "2026-10-01", to: null })).toBe("From 1 Oct 2026");
  });

  it("treats any changed filter as a different report request", () => {
    const filters = emptyReportFilters();
    expect(sameReportFilters(filters, { ...filters })).toBe(true);
    expect(sameReportFilters(filters, { ...filters, from: "2026-10-01" })).toBe(false);
  });
});
