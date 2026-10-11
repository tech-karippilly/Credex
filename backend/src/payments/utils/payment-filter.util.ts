import { BadRequestException } from '@nestjs/common';
import { parseExpenseDate } from '../../expenses/utils/expense-date.util';

export interface PaymentFilterInput {
  paymentMethod?: string;
  status?: string;
  payee?: string;
  chequeNumber?: string;
  reference?: string;
  from?: string;
  to?: string;
}

/** Field filters combine with AND. Reference matches the UTR or transaction reference only. */
export function buildPaymentFieldFilter(
  input: PaymentFilterInput,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.paymentMethod) filter.paymentMethod = input.paymentMethod;
  if (input.status) filter.status = input.status;

  const payee = input.payee?.trim();
  if (payee) filter.payee = containsRegex(payee);

  const chequeNumber = input.chequeNumber?.trim();
  if (chequeNumber) filter.chequeNumber = containsRegex(chequeNumber);

  const reference = input.reference?.trim();
  if (reference) filter.referenceNumber = containsRegex(reference);

  if (input.from || input.to) {
    if (input.from && input.to && input.from > input.to) {
      throw new BadRequestException('From date cannot be later than To date.');
    }

    const paymentDate: { $gte?: Date; $lte?: Date } = {};
    if (input.from) paymentDate.$gte = parseFilterDate(input.from, 'from date');
    if (input.to) {
      const end = parseFilterDate(input.to, 'to date');
      end.setUTCHours(23, 59, 59, 999);
      paymentDate.$lte = end;
    }
    filter.paymentDate = paymentDate;
  }

  return filter;
}

function containsRegex(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function parseFilterDate(value: string, label: string): Date {
  try {
    return parseExpenseDate(value);
  } catch {
    throw new BadRequestException(`Invalid ${label}`);
  }
}
