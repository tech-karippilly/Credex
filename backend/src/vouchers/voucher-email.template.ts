import { COMPANY } from '../common/constants/company.constants';
import { VoucherResponse } from './interfaces/voucher-response.interface';
import {
  formatInrAmount,
  formatPaymentModeLabel,
  formatVoucherDate,
} from './utils/voucher-format.util';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildVoucherEmailHtml(
  voucher: VoucherResponse,
  message?: string,
): string {
  const intro = message?.trim()
    ? escapeHtml(message.trim())
    : 'Please find your voucher details below.';

  const rows = [
    ['Voucher number', voucher.voucherNumber],
    ['Date', formatVoucherDate(voucher.voucherDate)],
    ['Type', voucher.voucherType],
    ['Title', voucher.title],
    ['Amount', formatInrAmount(voucher.amount)],
    ['Payment mode', formatPaymentModeLabel(voucher.paymentMode)],
    ['Paid by', voucher.paidBy],
    ['Payee', voucher.payee],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 12px;border:1px solid #e5e7eb;color:#555;font-size:14px;width:38%">${escapeHtml(label)}</td><td style="padding:10px 12px;border:1px solid #e5e7eb;color:#00142B;font-size:14px;font-weight:600">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f9fb;font-family:Arial,Helvetica,sans-serif;color:#00142B">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fb;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <tr><td style="background:${COMPANY.primaryColor};padding:20px 24px">
          <div style="color:#ffffff;font-size:18px;font-weight:bold">${escapeHtml(COMPANY.brand)}</div>
          <div style="color:#dbeafe;font-size:12px;margin-top:4px">Voucher notification</div>
        </td></tr>
        <tr><td style="padding:24px">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${intro}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${tableRows}</table>
          <p style="margin:20px 0 0;font-size:12px;color:#666;line-height:1.5">The voucher PDF is attached when available. This email was sent from the Credex admin panel and does not change the voucher payment status.</p>
        </td></tr>
        <tr><td style="padding:16px 24px;background:#f9fafb;font-size:11px;color:#888;text-align:center">
          ${escapeHtml(COMPANY.legalName)} · ${escapeHtml(COMPANY.location)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildVoucherEmailText(
  voucher: VoucherResponse,
  message?: string,
): string {
  const intro = message?.trim() || 'Please find your voucher details below.';
  return `${intro}

Voucher number: ${voucher.voucherNumber}
Date: ${formatVoucherDate(voucher.voucherDate)}
Type: ${voucher.voucherType}
Title: ${voucher.title}
Amount: ${formatInrAmount(voucher.amount)}
Payment mode: ${formatPaymentModeLabel(voucher.paymentMode)}
Paid by: ${voucher.paidBy}
Payee: ${voucher.payee}

— ${COMPANY.brand}`;
}

export function buildVoucherWhatsappBody(
  voucher: VoucherResponse,
  message?: string,
): string {
  const intro = message?.trim() || 'Please find the voucher details.';
  return `${intro}

Voucher: ${voucher.voucherNumber}
Date: ${formatVoucherDate(voucher.voucherDate)}
Title: ${voucher.title}
Type: ${voucher.voucherType}
Amount: ${formatInrAmount(voucher.amount)}
Payment mode: ${formatPaymentModeLabel(voucher.paymentMode)}
Paid by: ${voucher.paidBy}
Payee: ${voucher.payee}

— ${COMPANY.brand}`;
}
