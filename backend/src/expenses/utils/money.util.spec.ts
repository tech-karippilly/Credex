import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { hasAtMostTwoDecimalPlaces, inrToPaise } from './money.util';

describe('expense amount precision', () => {
  it('accepts whole rupees and exact two-decimal amounts', () => {
    expect(hasAtMostTwoDecimalPlaces(5000)).toBe(true);
    expect(hasAtMostTwoDecimalPlaces(19.99)).toBe(true);
    expect(hasAtMostTwoDecimalPlaces(0.01)).toBe(true);
    expect(inrToPaise(19.99)).toBe(1999);
    expect(inrToPaise(10.5)).toBe(1050);
  });

  it('rejects amounts that are not an exact number of paise', () => {
    expect(hasAtMostTwoDecimalPlaces(1.005)).toBe(false);
    expect(hasAtMostTwoDecimalPlaces(10.125)).toBe(false);
    expect(hasAtMostTwoDecimalPlaces(Number.NaN)).toBe(false);
  });

  it('rejects a create payload whose amount has more than 2 decimal places', async () => {
    const dto = plainToInstance(CreateExpenseDto, {
      expenseName: 'Hosting',
      categoryId: '507f1f77bcf86cd799439011',
      paidBy: 'Company',
      amount: 1.005,
      date: '2026-10-08',
    });

    const errors = await validate(dto);
    const amountError = errors.find((error) => error.property === 'amount');

    expect(amountError).toBeDefined();
    expect(amountError?.constraints).toHaveProperty('isTwoDecimalAmount');
  });
});
