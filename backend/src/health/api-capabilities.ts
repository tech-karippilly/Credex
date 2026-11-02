/** Advertised in GET /health so clients and operators can verify a deployment. */
export const API_CAPABILITIES = {
  expensePaymentStatusFilter: true,
  employees: true,
  fixedExpenses: true,
  attendance: true,
} as const;

export type ApiCapabilities = typeof API_CAPABILITIES;
