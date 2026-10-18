import { apiRequest } from "./api";
import type { PaymentMode } from "./vouchers-api";

export type PaymentMethod = PaymentMode;
export type TransferMethod = "NEFT" | "RTGS" | "IMPS" | "OTHER";
export type PaymentStatus =
  | "ISSUED"
  | "PRESENTED"
  | "CLEARED"
  | "BOUNCED"
  | "CANCELLED"
  | "INITIATED"
  | "COMPLETED"
  | "FAILED";

export type PaymentDocument = {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
};

export type PaymentAllocation = {
  voucherId: string;
  voucherNumber: string;
  voucherTitle: string;
  voucherDate: string;
  payee: string;
  voucherAmount: number;
  amount: number;
  amountPaid: number;
  outstandingAmount: number;
  availableToAllocate: number;
  settlementStatus: string;
};

export type PaymentAuditEntry = {
  action: string;
  actorId: string;
  actorEmail: string;
  summary: string;
  changes: { field: string; previous: string; next: string }[];
  createdAt: string;
};

export type Payment = {
  id: string;
  paymentNumber: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  payee: string;
  sourceAccount: string;
  referenceNumber: string;
  chequeNumber: string;
  chequeDate: string | null;
  transferMethod: string;
  remarks: string;
  status: PaymentStatus;
  allowedStatuses: PaymentStatus[];
  financiallyLocked: boolean;
  document: PaymentDocument | null;
  allocations: PaymentAllocation[];
  linkedVoucherCount: number;
  createdBy: { id: string; email: string };
  audit: PaymentAuditEntry[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentListItem = {
  id: string;
  paymentNumber: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  payee: string;
  referenceNumber: string;
  chequeNumber: string;
  status: PaymentStatus;
  financiallyLocked: boolean;
  allowedStatuses: PaymentStatus[];
  linkedVoucherCount: number;
  createdAt: string;
};

export type PaymentListResult = {
  items: PaymentListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type EligibleVoucher = {
  id: string;
  voucherNumber: string;
  title: string;
  payee: string;
  voucherDate: string;
  amount: number;
  amountPaid: number;
  outstandingAmount: number;
  availableToAllocate: number;
  settlementStatus: string;
  status: string;
};

export type PaymentAllocationInput = {
  voucherId: string;
  amount: number;
};

export type SavePaymentRequest = {
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
  amount?: number;
  payee?: string;
  sourceAccount?: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  transferMethod?: TransferMethod;
  remarks?: string;
  status?: PaymentStatus;
  allocations?: PaymentAllocationInput[];
};

export type CreatePaymentRequest = SavePaymentRequest & {
  paymentMethod: PaymentMethod;
  paymentDate: string;
  amount: number;
  payee: string;
  allocations: PaymentAllocationInput[];
};

export type PaymentListParams = {
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  payee?: string;
  chequeNumber?: string;
  reference?: string;
  from?: string;
  to?: string;
  voucherId?: string;
  page?: number;
  limit?: number;
};

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const paymentsApi = {
  list(params?: PaymentListParams): Promise<PaymentListResult> {
    return apiRequest<PaymentListResult>(
      `/payments${queryString({
        paymentMethod: params?.paymentMethod,
        status: params?.status,
        payee: params?.payee,
        chequeNumber: params?.chequeNumber,
        reference: params?.reference,
        from: params?.from,
        to: params?.to,
        voucherId: params?.voucherId,
        page: params?.page,
        limit: params?.limit,
      })}`,
      { auth: true },
    );
  },

  get(id: string): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}`, { auth: true });
  },

  eligibleVouchers(params?: {
    search?: string;
    excludePaymentId?: string;
    limit?: number;
  }): Promise<EligibleVoucher[]> {
    return apiRequest<EligibleVoucher[]>(
      `/payments/eligible-vouchers${queryString({
        search: params?.search,
        excludePaymentId: params?.excludePaymentId,
        limit: params?.limit,
      })}`,
      { auth: true },
    );
  },

  create(payload: CreatePaymentRequest): Promise<Payment> {
    return apiRequest<Payment>("/payments", { method: "POST", auth: true, json: payload });
  },

  update(id: string, payload: SavePaymentRequest): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}`, { method: "PUT", auth: true, json: payload });
  },

  updateStatus(id: string, status: PaymentStatus, note?: string): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { status, note },
    });
  },

  uploadDocument(id: string, file: File): Promise<Payment> {
    const formData = new FormData();
    formData.append("document", file);
    return apiRequest<Payment>(`/payments/${id}/document`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  removeDocument(id: string): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}/document`, {
      method: "DELETE",
      auth: true,
    });
  },
};
