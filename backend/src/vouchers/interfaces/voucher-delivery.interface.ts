export interface VoucherDeliveryAttemptResponse {
  channel: string;
  recipient: string;
  status: string;
  providerMessageId?: string;
  errorSummary?: string;
  attemptedAt: string;
}

export interface VoucherShareResponse {
  voucher: import('./voucher-response.interface').VoucherResponse;
  deliveryAttempt: VoucherDeliveryAttemptResponse;
}
