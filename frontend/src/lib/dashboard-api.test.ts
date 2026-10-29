import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api";
import {
  currentMonthKey,
  dashboardApi,
  formatMonthKey,
  formatMonthLabel,
  parseMonthKey,
} from "./dashboard-api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

describe("dashboard month helpers", () => {
  it("builds and parses YYYY-MM keys on a UTC basis", () => {
    expect(currentMonthKey(new Date("2026-10-22T12:00:00.000Z"))).toBe(
      "2026-10",
    );
    expect(parseMonthKey("2026-03")).toEqual({ year: 2026, monthNumber: 3 });
    expect(formatMonthKey(2025, 9)).toBe("2025-09");
    expect(formatMonthLabel("2026-10")).toMatch(/October.*2026/);
  });
});

describe("dashboardApi", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("sends the signed-in session on expense dashboard reads", async () => {
    vi.mocked(apiRequest).mockResolvedValue({} as never);

    await dashboardApi.expensesSummary("2026-10");
    await dashboardApi.expensesByCategory("2026-10");

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/dashboard/expenses-summary?month=2026-10",
      { auth: true },
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/dashboard/expenses-by-category?month=2026-10",
      { auth: true },
    );
  });
});
