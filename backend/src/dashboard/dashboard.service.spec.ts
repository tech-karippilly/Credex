import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Expense } from '../expenses/schemas/expense.schema';
import {
  currentUtcMonthKey,
  DashboardService,
  shiftMonthKey,
} from './dashboard.service';

describe('DashboardService', () => {
  const aggregate = jest.fn();
  let service: DashboardService;

  beforeEach(async () => {
    aggregate.mockReset();
    aggregate.mockImplementation(() => ({
      exec: () => Promise.resolve([]),
    }));
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getModelToken(Expense.name),
          useValue: { aggregate },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  it('sums expense amountPaise for the selected invoice-date month', async () => {
    aggregate
      .mockImplementationOnce(() => ({
        exec: () =>
          Promise.resolve([{ totalPaise: 125050, expenseCount: 2 }]),
      }))
      .mockImplementationOnce(() => ({
        exec: () =>
          Promise.resolve([{ totalPaise: 100000, expenseCount: 1 }]),
      }));

    const result = await service.getExpensesSummary('2026-10');

    expect(result).toEqual({
      dateBasis: 'invoiceDate',
      month: '2026-10',
      year: 2026,
      monthNumber: 10,
      totalAmount: 1250.5,
      expenseCount: 2,
      previousMonth: {
        month: '2026-09',
        totalAmount: 1000,
        expenseCount: 1,
      },
      changeAmount: 250.5,
      changePercent: 25.05,
    });

    const firstMatch = aggregate.mock.calls[0][0][0].$match;
    expect(firstMatch.date.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(firstMatch.date.$lte.toISOString()).toBe('2026-10-31T23:59:59.999Z');
  });

  it('returns zero totals for empty months without dividing by zero', async () => {
    const result = await service.getExpensesSummary('2026-01');

    expect(result.totalAmount).toBe(0);
    expect(result.expenseCount).toBe(0);
    expect(result.previousMonth).toEqual({
      month: '2025-12',
      totalAmount: 0,
      expenseCount: 0,
    });
    expect(result.changeAmount).toBe(0);
    expect(result.changePercent).toBeNull();
  });

  it('defaults to the current UTC month', async () => {
    const result = await service.getExpensesSummary();

    expect(result.month).toBe(currentUtcMonthKey());
    expect(result.previousMonth.month).toBe(shiftMonthKey(result.month, -1));
  });

  it('aggregates expenses by category with percentages for the invoice-date month', async () => {
    aggregate.mockImplementationOnce(() => ({
      exec: () =>
        Promise.resolve([
          {
            _id: { categoryId: 'cat-rent', categoryName: 'Rent' },
            totalPaise: 1929400,
            expenseCount: 1,
          },
          {
            _id: { categoryId: 'cat-server', categoryName: 'Server' },
            totalPaise: 500000,
            expenseCount: 1,
          },
          {
            _id: { categoryId: null, categoryName: 'Unknown category' },
            totalPaise: 20000,
            expenseCount: 1,
          },
        ]),
    }));

    const result = await service.getExpensesByCategory('2026-10');

    expect(result).toEqual({
      dateBasis: 'invoiceDate',
      month: '2026-10',
      year: 2026,
      monthNumber: 10,
      totalAmount: 24494,
      expenseCount: 3,
      categories: [
        {
          categoryId: 'cat-rent',
          categoryName: 'Rent',
          totalAmount: 19294,
          expenseCount: 1,
          percent: 78.77,
        },
        {
          categoryId: 'cat-server',
          categoryName: 'Server',
          totalAmount: 5000,
          expenseCount: 1,
          percent: 20.41,
        },
        {
          categoryId: '',
          categoryName: 'Unknown category',
          totalAmount: 200,
          expenseCount: 1,
          percent: 0.82,
        },
      ],
    });

    const categoryTotal = result.categories.reduce(
      (sum, row) => sum + row.totalAmount,
      0,
    );
    expect(categoryTotal).toBe(result.totalAmount);

    const match = aggregate.mock.calls[0][0][0].$match;
    expect(match.date.$gte.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(match.date.$lte.toISOString()).toBe('2026-10-31T23:59:59.999Z');
  });

  it('groups excess categories under Other and handles empty months', async () => {
    const many = Array.from({ length: 9 }, (_, index) => ({
      _id: {
        categoryId: `cat-${index}`,
        categoryName: `Category ${index + 1}`,
      },
      totalPaise: (9 - index) * 10000,
      expenseCount: 1,
    }));
    aggregate.mockImplementationOnce(() => ({
      exec: () => Promise.resolve(many),
    }));

    const grouped = await service.getExpensesByCategory('2026-10');
    expect(grouped.categories).toHaveLength(8);
    expect(grouped.categories[7]).toMatchObject({
      categoryId: 'other',
      categoryName: 'Other',
      totalAmount: 300,
      expenseCount: 2,
    });
    const groupedSum = grouped.categories.reduce(
      (sum, row) => sum + row.totalAmount,
      0,
    );
    expect(groupedSum).toBe(grouped.totalAmount);

    aggregate.mockImplementationOnce(() => ({
      exec: () => Promise.resolve([]),
    }));
    const empty = await service.getExpensesByCategory('2026-01');
    expect(empty.totalAmount).toBe(0);
    expect(empty.expenseCount).toBe(0);
    expect(empty.categories).toEqual([]);
  });
});

describe('month key helpers', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2025-12', 1)).toBe('2026-01');
  });
});
