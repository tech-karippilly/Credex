import { BadGatewayException } from '@nestjs/common';
import { parseReceiptExtraction } from './parse-receipt-extraction';

const CATEGORIES = ['Server', 'Domain', 'Other services'];

describe('parseReceiptExtraction', () => {
  it('parses valid JSON extraction', () => {
    const result = parseReceiptExtraction(
      JSON.stringify({
        expenseName: 'AWS Hosting',
        category: 'Server',
        paidBy: null,
        amount: 5000,
        date: '2026-10-08',
        notes: 'October hosting',
        confidence: 0.94,
      }),
      CATEGORIES,
    );

    expect(result).toEqual({
      expenseName: 'AWS Hosting',
      categoryId: null,
      categoryName: 'Server',
      paidBy: null,
      amount: 5000,
      date: '2026-10-08',
      invoiceDate: '2026-10-08',
      notes: 'October hosting',
      confidence: 0.94,
    });
  });

  it('rejects invalid category and empty extraction', () => {
    expect(() =>
      parseReceiptExtraction(
        JSON.stringify({
          expenseName: null,
          category: 'Invalid',
          paidBy: null,
          amount: null,
          date: null,
          notes: null,
        }),
        CATEGORIES,
      ),
    ).toThrow(BadGatewayException);
  });
});
