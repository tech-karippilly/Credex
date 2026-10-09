import { apiRequest } from "./api";

export type VoucherType = "PAYMENT" | "RECEIPT" | "GENERAL";
export type VoucherStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type PaymentMode =
  | "CASH"
  | "BANK_TRANSFER"
  | "UPI"
  | "CARD"
  | "CHEQUE"
  | "OTHER";

export type VoucherDocument = {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
};

export type Voucher = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: VoucherType;
  title: string;
  description: string;
  paidBy: string;
  payee: string;
  amount: number;
  currency: string;
  paymentMode: PaymentMode;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  expenseId: string | null;
  expense: { id: string; expenseName: string; amount: number } | null;
  referenceNumber: string;
  notes: string;
  document: VoucherDocument | null;
  status: VoucherStatus;
  createdAt: string;
  updatedAt: string;
};

export type VoucherListResult = {
  items: Voucher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateVoucherRequest = {
  voucherDate: string;
  voucherType: VoucherType;
  title: string;
  description?: string;
  paidBy: string;
  payee: string;
  amount: number;
  paymentMode: PaymentMode;
  categoryId?: string;
  expenseId?: string;
  referenceNumber?: string;
  notes?: string;
  status?: VoucherStatus;
};

export type UpdateVoucherRequest = Partial<CreateVoucherRequest> & {
  categoryId?: string | null;
  expenseId?: string | null;
};

export type VoucherDeliveryAttempt = {
  channel: "EMAIL" | "WHATSAPP";
  recipient: string;
  status: "ACCEPTED" | "DELIVERED" | "FAILED";
  providerMessageId?: string;
  errorSummary?: string;
  attemptedAt: string;
};

export type VoucherShareResult = {
  voucher: Voucher;
  deliveryAttempt: VoucherDeliveryAttempt;
};

export type SendVoucherEmailRequest = {
  email: string;
  message?: string;
};

export type SendVoucherWhatsappRequest = {
  phone: string;
  message?: string;
};

export type VoucherListParams = {
  search?: string;
  voucherType?: VoucherType;
  status?: VoucherStatus;
  categoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export const vouchersApi = {
  list(params?: VoucherListParams): Promise<VoucherListResult> {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.voucherType) search.set("voucherType", params.voucherType);
    if (params?.status) search.set("status", params.status);
    if (params?.categoryId) search.set("categoryId", params.categoryId);
    if (params?.from) search.set("from", params.from);
    if (params?.to) search.set("to", params.to);
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const q = search.toString();
    return apiRequest<VoucherListResult>(`/vouchers${q ? `?${q}` : ""}`, {
      auth: true,
    });
  },

  get(id: string): Promise<Voucher> {
    return apiRequest<Voucher>(`/vouchers/${id}`, { auth: true });
  },

  create(payload: CreateVoucherRequest): Promise<Voucher> {
    return apiRequest<Voucher>("/vouchers", {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  update(id: string, payload: UpdateVoucherRequest): Promise<Voucher> {
    return apiRequest<Voucher>(`/vouchers/${id}`, {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  updateStatus(id: string, status: VoucherStatus): Promise<Voucher> {
    return apiRequest<Voucher>(`/vouchers/${id}/status`, {
      method: "PATCH",
      auth: true,
      json: { status },
    });
  },

  delete(id: string): Promise<void> {
    return apiRequest<void>(`/vouchers/${id}`, {
      method: "DELETE",
      auth: true,
    });
  },

  uploadDocument(id: string, file: File): Promise<Voucher> {
    const formData = new FormData();
    formData.append("document", file);
    return apiRequest<Voucher>(`/vouchers/${id}/document`, {
      method: "POST",
      auth: true,
      formData,
    });
  },

  deleteDocument(id: string): Promise<Voucher> {
    return apiRequest<Voucher>(`/vouchers/${id}/document`, {
      method: "DELETE",
      auth: true,
    });
  },

  sendEmail(id: string, payload: SendVoucherEmailRequest): Promise<VoucherShareResult> {
    return apiRequest<VoucherShareResult>(`/vouchers/${id}/send-email`, {
      method: "POST",
      auth: true,
      json: payload,
    });
  },

  sendWhatsapp(
    id: string,
    payload: SendVoucherWhatsappRequest,
  ): Promise<VoucherShareResult> {
    return apiRequest<VoucherShareResult>(`/vouchers/${id}/send-whatsapp`, {
      method: "POST",
      auth: true,
      json: payload,
    });
  },
};
