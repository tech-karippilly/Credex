export interface PaymentDocumentSummary {
  url: string;
  publicId: string;
  fileName: string;
  mimeType: string;
}

export interface PaymentAllocationResponse {
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
}

export interface PaymentAuditResponse {
  action: string;
  actorId: string;
  actorEmail: string;
  summary: string;
  changes: { field: string; previous: string; next: string }[];
  createdAt: string;
}

export interface PaymentResponse {
  id: string;
  paymentNumber: string;
  paymentMethod: string;
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
  status: string;
  allowedStatuses: string[];
  financiallyLocked: boolean;
  document: PaymentDocumentSummary | null;
  allocations: PaymentAllocationResponse[];
  linkedVoucherCount: number;
  createdBy: { id: string; email: string };
  audit: PaymentAuditResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  paymentMethod: string;
  paymentDate: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  payee: string;
  referenceNumber: string;
  chequeNumber: string;
  status: string;
  financiallyLocked: boolean;
  allowedStatuses: string[];
  linkedVoucherCount: number;
  createdAt: string;
}

export interface PaymentListResponse {
  items: PaymentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EligibleVoucherResponse {
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
}
