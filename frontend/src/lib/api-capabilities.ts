import { getApiBaseUrl } from "./api";

export type ApiCapabilities = {
  expensePaymentStatusFilter: boolean;
  employees: boolean;
  fixedExpenses: boolean;
};

/** Used until /health responds with a capabilities block (legacy api.credexfin.com builds). */
export const LEGACY_API_CAPABILITIES: ApiCapabilities = {
  expensePaymentStatusFilter: false,
  employees: false,
  fixedExpenses: false,
};

function parseCapabilities(raw: unknown): ApiCapabilities | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  return {
    expensePaymentStatusFilter: record.expensePaymentStatusFilter === true,
    employees: record.employees === true,
    fixedExpenses: record.fixedExpenses === true,
  };
}

let cached: ApiCapabilities | null = null;

export async function fetchApiCapabilities(): Promise<ApiCapabilities> {
  if (cached) return cached;

  try {
    const res = await fetch(`${getApiBaseUrl()}/health`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      cached = LEGACY_API_CAPABILITIES;
      return cached;
    }
    const body = (await res.json()) as { data?: { capabilities?: unknown } };
    const parsed = parseCapabilities(body.data?.capabilities);
    cached = parsed ?? LEGACY_API_CAPABILITIES;
    return cached;
  } catch {
    cached = LEGACY_API_CAPABILITIES;
    return cached;
  }
}

export function adminTabNeedsCapability(tab: string): keyof ApiCapabilities | null {
  if (tab === "fixed-expenses") return "fixedExpenses";
  if (tab === "employees" || tab === "salaries" || tab === "departments" || tab === "designations") {
    return "employees";
  }
  return null;
}

export function adminTabSupportedByApi(tab: string, capabilities: ApiCapabilities): boolean {
  const key = adminTabNeedsCapability(tab);
  return key ? capabilities[key] : true;
}
