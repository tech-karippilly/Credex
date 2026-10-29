import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { ExpenseCategory } from '../src/expense-categories/schemas/expense-category.schema';
import { Expense } from '../src/expenses/schemas/expense.schema';
import { RolePermissionsService } from '../src/rbac/role-permissions.service';
import { RolesService } from '../src/rbac/roles.service';
import { UserRolesService } from '../src/rbac/user-roles.service';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Dashboard (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let expenseModel: Model<Expense>;
  let categoryModel: Model<ExpenseCategory>;
  let rolesService: RolesService;
  let rolePermissions: RolePermissionsService;
  let userRoles: UserRolesService;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    expenseModel = app.get<Model<Expense>>(getModelToken(Expense.name));
    categoryModel = app.get<Model<ExpenseCategory>>(
      getModelToken(ExpenseCategory.name),
    );
    rolesService = app.get(RolesService);
    rolePermissions = app.get(RolePermissionsService);
    userRoles = app.get(UserRolesService);
  });

  afterAll(async () => {
    await context.teardown();
  });

  beforeEach(async () => {
    await expenseModel.deleteMany({}).exec();
    await categoryModel.deleteMany({}).exec();
  });

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.data as {
      accessToken: string;
      user: { id: string };
    };
  }

  async function createUser(email: string) {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: 'Dashboard User',
        email,
        password: 'SecurePassword123',
      })
      .expect(201);

    return {
      id: response.body.data.id as string,
      email,
      password: 'SecurePassword123',
    };
  }

  async function seedExpenses() {
    const [office, rent] = await categoryModel.create([
      {
        name: 'Office',
        nameNormalized: 'office',
        order: 1,
        isActive: true,
      },
      {
        name: 'Rent',
        nameNormalized: 'rent',
        order: 2,
        isActive: true,
      },
    ]);

    await expenseModel.create([
      {
        expenseName: 'October rent',
        categoryId: rent._id,
        paidBy: 'Admin',
        amountPaise: 100000,
        currency: 'INR',
        date: new Date('2026-10-05T00:00:00.000Z'),
        notes: '',
      },
      {
        expenseName: 'October supplies',
        categoryId: office._id,
        paidBy: 'Admin',
        amountPaise: 2550,
        currency: 'INR',
        date: new Date('2026-10-20T00:00:00.000Z'),
        notes: '',
      },
      {
        expenseName: 'September hosting',
        categoryId: office._id,
        paidBy: 'Admin',
        amountPaise: 50000,
        currency: 'INR',
        date: new Date('2026-09-15T00:00:00.000Z'),
        notes: '',
      },
      {
        expenseName: 'November travel',
        categoryId: office._id,
        paidBy: 'Admin',
        amountPaise: 90000,
        currency: 'INR',
        date: new Date('2026-11-01T00:00:00.000Z'),
        notes: '',
      },
      {
        expenseName: 'Orphan expense',
        categoryId: new Types.ObjectId(),
        paidBy: 'Admin',
        amountPaise: 4500,
        currency: 'INR',
        date: new Date('2026-10-12T00:00:00.000Z'),
        notes: '',
      },
    ]);

    return { officeId: office._id as Types.ObjectId, rentId: rent._id as Types.ObjectId };
  }

  it('aggregates expense amounts by invoice date for the selected month', async () => {
    await seedExpenses();
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2026-10')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      dateBasis: 'invoiceDate',
      month: '2026-10',
      year: 2026,
      monthNumber: 10,
      totalAmount: 1070.5,
      expenseCount: 3,
      previousMonth: {
        month: '2026-09',
        totalAmount: 500,
        expenseCount: 1,
      },
      changeAmount: 570.5,
      changePercent: 114.1,
    });
  });

  it('aggregates expenses by category for the selected invoice-date month', async () => {
    const seeded = await seedExpenses();
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-by-category?month=2026-10')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(response.body.data).toMatchObject({
      dateBasis: 'invoiceDate',
      month: '2026-10',
      year: 2026,
      monthNumber: 10,
      totalAmount: 1070.5,
      expenseCount: 3,
    });

    const categories = response.body.data.categories as Array<{
      categoryId: string;
      categoryName: string;
      totalAmount: number;
      percent: number;
    }>;

    expect(categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: seeded.rentId.toString(),
          categoryName: 'Rent',
          totalAmount: 1000,
          percent: 93.41,
        }),
        expect.objectContaining({
          categoryId: seeded.officeId.toString(),
          categoryName: 'Office',
          totalAmount: 25.5,
          percent: 2.38,
        }),
        expect.objectContaining({
          categoryName: 'Unknown category',
          totalAmount: 45,
          percent: 4.2,
        }),
      ]),
    );

    const categorySum = categories.reduce(
      (sum, row) => sum + row.totalAmount,
      0,
    );
    expect(categorySum).toBe(response.body.data.totalAmount);
  });

  it('returns zero for empty months and year selection works', async () => {
    await seedExpenses();
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    const empty = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2025-03')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(empty.body.data.totalAmount).toBe(0);
    expect(empty.body.data.expenseCount).toBe(0);
    expect(empty.body.data.previousMonth.month).toBe('2025-02');

    const nextYear = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2026-11')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(nextYear.body.data.totalAmount).toBe(900);
    expect(nextYear.body.data.year).toBe(2026);
    expect(nextYear.body.data.monthNumber).toBe(11);
  });

  it('does not require expenses.read and rejects users without the dashboard permission', async () => {
    await seedExpenses();
    const user = await createUser('dash-summary@example.com');
    const role = await rolesService.create({
      name: 'Dashboard expenses summary',
      key: 'dash-expenses-summary',
      description: 'Dashboard card only',
    });
    await rolePermissions.grant(
      role._id.toString(),
      'dashboard.expenses_summary.read',
    );
    await userRoles.assign(user.id, role._id.toString());

    const session = await login(user.email, user.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const summary = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2026-10')
      .set(auth)
      .expect(200);

    expect(summary.body.data.totalAmount).toBe(1070.5);

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth)
      .expect(403);

    await userRoles.revoke(user.id, role._id.toString());

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2026-10')
      .set(auth)
      .expect(403);
  });

  it('does not require expenses.read for expenses-by-category and rejects unauthorized users', async () => {
    await seedExpenses();
    const user = await createUser('dash-by-category@example.com');
    const role = await rolesService.create({
      name: 'Dashboard expenses by category',
      key: 'dash-expenses-by-category',
      description: 'Dashboard category card only',
    });
    await rolePermissions.grant(
      role._id.toString(),
      'dashboard.expenses_by_category.read',
    );
    await userRoles.assign(user.id, role._id.toString());

    const session = await login(user.email, user.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const byCategory = await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-by-category?month=2026-10')
      .set(auth)
      .expect(200);

    expect(byCategory.body.data.totalAmount).toBe(1070.5);

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-summary?month=2026-10')
      .set(auth)
      .expect(403);

    await userRoles.revoke(user.id, role._id.toString());

    await request(app.getHttpServer())
      .get('/api/v1/dashboard/expenses-by-category?month=2026-10')
      .set(auth)
      .expect(403);
  });

  it('exposes the new permission in the catalogue for role assignment', async () => {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    const catalogue = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const keys = (catalogue.body.data as Array<{ key: string }>).map(
      (item) => item.key,
    );
    expect(keys).toContain('dashboard.expenses_summary.read');
    expect(keys).toContain('dashboard.expenses_by_category.read');
  });
});
