import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { Expense } from '../src/expenses/schemas/expense.schema';
import { ExpenseCategory } from '../src/expense-categories/schemas/expense-category.schema';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Expense categories (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let categoryModel: Model<ExpenseCategory>;
  let expenseModel: Model<Expense>;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    categoryModel = app.get<Model<ExpenseCategory>>(
      getModelToken(ExpenseCategory.name),
    );
    expenseModel = app.get<Model<Expense>>(getModelToken(Expense.name));
  });

  afterAll(async () => {
    await context.teardown();
  });

  beforeEach(async () => {
    await expenseModel.deleteMany({});
    await categoryModel.deleteMany({});
    await categoryModel.create({
      name: 'Server',
      nameNormalized: 'server',
      description: 'Hosting',
      isActive: true,
      order: 1,
    });
  });

  async function loginAsAdmin(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);

    return response.body.data.accessToken as string;
  }

  it('creates, lists, updates, and toggles categories', async () => {
    const token = await loginAsAdmin();

    const created = await request(app.getHttpServer())
      .post('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Office Expenses',
        description: 'Office-related company expenses',
        order: 4,
      })
      .expect(201);

    expect(created.body.data.name).toBe('Office Expenses');
    expect(created.body.data.isActive).toBe(true);

    await request(app.getHttpServer())
      .post('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'office expenses' })
      .expect(409);

    const adminList = await request(app.getHttpServer())
      .get('/api/v1/expense-categories/admin')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(adminList.body.data.length).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .patch(`/api/v1/expense-categories/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false })
      .expect(200);

    const activeList = await request(app.getHttpServer())
      .get('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      activeList.body.data.some(
        (row: { name: string }) => row.name === 'Office Expenses',
      ),
    ).toBe(false);

    const updated = await request(app.getHttpServer())
      .put(`/api/v1/expense-categories/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Office & Admin' })
      .expect(200);

    expect(updated.body.data.name).toBe('Office & Admin');

    await request(app.getHttpServer())
      .patch(`/api/v1/expense-categories/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: true })
      .expect(200);
  });

  it('deletes unused categories and blocks deleting used categories', async () => {
    const token = await loginAsAdmin();
    const server = await categoryModel.findOne({ nameNormalized: 'server' }).exec();

    const unused = await request(app.getHttpServer())
      .post('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Travel' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/expense-categories/${unused.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await expenseModel.create({
      expenseName: 'AWS',
      categoryId: server!._id,
      paidBy: 'Admin',
      amountPaise: 500000,
      currency: 'INR',
      date: new Date('2026-10-08'),
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/expense-categories/${server!._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });

  it('requires admin authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/expense-categories/admin')
      .expect(401);
  });
});
