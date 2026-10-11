/**
 * Financial summary formulas used by the Reports page and Excel exports.
 * Amounts are stored in paise and converted to INR once, with paise / 100.
 * Date filters are inclusive UTC calendar days, matching the expense, voucher,
 * and payment ledgers: from 00:00:00.000Z through to 23:59:59.999Z.
 */

export const EXPENSE_REPORT_NOTES = [
  'Expense total = sum of expense.amountPaise / 100 for every matching expense. This is recorded spending, not a voucher total or a payment total.',
  'Category totals and date totals use that same expense set, including rows that are not on the current page.',
  'From and to dates are inclusive calendar dates, using the same UTC day boundary as the expense ledger.',
];

export const VOUCHER_REPORT_NOTES = [
  'Voucher total = sum of voucher.amountPaise / 100. This is the recorded voucher amount, not a disbursement.',
  'Amount settled = sum of voucher.settledPaise / 100. settledPaise increases only when a linked payment is CLEARED or COMPLETED.',
  'Outstanding = sum of max(0, voucher.amountPaise - settledPaise) / 100. Issued, presented, initiated, bounced, cancelled, and failed payments do not increase settledPaise.',
  'A missing settledPaise on an older voucher is treated as zero, which is the stored default. The report does not invent payment history.',
  'Type, status, and date totals cover every matching voucher, including rows that are not on the current page.',
];

export const PAYMENT_REPORT_NOTES = [
  'Recorded payment total = sum of payment.amountPaise / 100 for every matching payment. Each payment is counted once, even when its amount is split across several vouchers.',
  'Cleared / settled amount = sum of payment.amountPaise / 100 where status is CLEARED or COMPLETED. Issued, presented, initiated, bounced, cancelled, and failed payments are excluded.',
  'Allocated amount = sum of stored allocation rows on the matching payments. Splitting one payment across vouchers does not count that payment twice.',
  'Unallocated amount = recorded payment total minus allocated amount.',
  'Method and status totals cover every matching payment, including rows that are not on the current page.',
  'Source account numbers are omitted from this report.',
];
