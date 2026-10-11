import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EmailService } from '../src/email/email.service';
import { ExpenseCategory } from '../src/expense-categories/schemas/expense-category.schema';
import { Expense } from '../src/expenses/schemas/expense.schema';
import { PaymentAllocation } from '../src/payments/schemas/payment-allocation.schema';
import { Payment } from '../src/payments/schemas/payment.schema';
import { Voucher } from '../src/vouchers/schemas/voucher.schema';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import './setup-env';

describe('Financial reports (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let expenseModel: Model<Expense>;
  let categoryModel: Model<ExpenseCategory>;
  let voucherModel: Model<Voucher>;
  let paymentModel: Model<Payment>;
  let allocationModel: Model<PaymentAllocation>;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({ sendEmail: jest.fn() })
      .overrideProvider(WhatsappService)
      .useValue({
        isConfigured: jest.fn().mockReturnValue(true),
        assertConfigured: jest.fn(),
        sendVoucherMessage: jest.fn(),
      })
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadImage: jest.fn(),
        uploadDocument: jest.fn(),
        deleteAsset: jest.fn(),
      })
      .overrideProvider(AiService)
      .useValue({
        generateText: jest.fn(),
        generateWithInlineData: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    expenseModel = app.get(getModelToken(Expense.name));
    categoryModel = app.get(getModelToken(ExpenseCategory.name));
    voucherModel = app.get(getModelToken(Voucher.name));
    paymentModel = app.get(getModelToken(Payment.name));
    allocationModel = app.get(getModelToken(PaymentAllocation.name));
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await allocationModel.deleteMany({});
    await paymentModel.deleteMany({});
    await voucherModel.deleteMany({});
    await expenseModel.deleteMany({});
    await categoryModel.deleteMany({});
    await categoryModel.insertMany([
      {
        name: 'Server',
        nameNormalized: 'server',
        description: 'Hosting',
        isActive: true,
        order: 1,
      },
      {
        name: 'Domain',
        nameNormalized: 'domain',
        description: 'Domains',
        isActive: true,
        order: 2,
      },
    ]);
  });

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);
    return response.body.data.accessToken as string;
  }

  async function categoryId(token: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .get('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const match = response.body.data.find(
      (row: { name: string }) => row.name === name,
    );
    if (!match) throw new Error(`Missing category ${name}`);
    return match.id as string;
  }

  async function createExpense(
    token: string,
    overrides: Record<string, unknown>,
  ) {
    const resolvedCategoryId =
      typeof overrides.categoryId === 'string'
        ? overrides.categoryId
        : await categoryId(token, 'Server');
    const response = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        expenseName: 'AWS',
        paidBy: 'Credex',
        amount: 5000,
        date: '2026-10-01',
        ...overrides,
        categoryId: resolvedCategoryId,
      })
      .expect(201);
    return response.body.data as { id: string; expenseName: string };
  }

  async function createVoucher(
    token: string,
    amount: number,
    title: string,
    overrides: Record<string, unknown> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        voucherDate: '2026-10-11',
        voucherType: 'PAYMENT',
        title,
        paidBy: 'Credex',
        payee: 'Vendor',
        amount,
        paymentMode: 'CHEQUE',
        ...overrides,
      })
      .expect(201);
    return response.body.data as { id: string; voucherNumber: string };
  }

  function authGet(token: string, path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);
  }

  function authFile(token: string, path: string) {
    return request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
  }

  async function workbookFrom(response: request.Response) {
    const workbook = new ExcelJS.Workbook();
    const raw = response.body as Buffer;
    await workbook.xlsx.load(raw as unknown as ExcelJS.Buffer);
    return workbook;
  }

  function sheetText(sheet: ExcelJS.Worksheet | undefined): string {
    if (!sheet) return '';
    const lines: string[] = [];
    sheet.eachRow((row) => {
      const values = row.values as unknown[];
      lines.push(values.map((cell) => String(cell ?? '')).join(' | '));
    });
    return lines.join('\n');
  }

  it('requires an authenticated administrator', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/expenses').expect(401);
    await request(app.getHttpServer()).get('/api/v1/reports/vouchers').expect(401);
    await request(app.getHttpServer()).get('/api/v1/reports/payments').expect(401);
  });

  it('rejects a from date later than the to date', async () => {
    const token = await login();
    for (const path of [
      '/api/v1/reports/expenses',
      '/api/v1/reports/vouchers',
      '/api/v1/reports/payments',
    ]) {
      const response = await authGet(
        token,
        `${path}?from=2026-10-31&to=2026-10-01`,
      ).expect(400);
      expect(response.body.message).toBe(
        'From date cannot be later than To date.',
      );
    }
  });

  it('summarises every matching expense, including rows off the current page', async () => {
    const token = await login();
    const serverId = await categoryId(token, 'Server');
    const domainId = await categoryId(token, 'Domain');
    await createExpense(token, {
      expenseName: 'AWS',
      categoryId: serverId,
      amount: 5000,
      date: '2026-10-01',
      paidBy: 'Credex',
    });
    await createExpense(token, {
      expenseName: 'Domain renewal',
      categoryId: domainId,
      amount: 1200,
      date: '2026-10-02',
      paidBy: 'Accounts',
    });
    await createExpense(token, {
      expenseName: 'Old hosting',
      categoryId: serverId,
      amount: 999,
      date: '2026-09-01',
    });

    const report = await authGet(
      token,
      '/api/v1/reports/expenses?from=2026-10-01&to=2026-10-31&limit=1',
    ).expect(200);

    expect(report.body.data.summary.count).toBe(2);
    expect(report.body.data.summary.expenseTotal).toBe(6200);
    expect(report.body.data.items).toHaveLength(1);
    expect(report.body.data.meta.pagination.total).toBe(2);
    expect(report.body.data.summary.byCategory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Server', count: 1, amount: 5000 }),
        expect.objectContaining({ label: 'Domain', count: 1, amount: 1200 }),
      ]),
    );
    expect(report.body.data.summary.byDate).toEqual([
      expect.objectContaining({ key: '2026-10-01', amount: 5000 }),
      expect.objectContaining({ key: '2026-10-02', amount: 1200 }),
    ]);

    const combined = await authGet(
      token,
      `/api/v1/reports/expenses?from=2026-10-01&to=2026-10-31&categoryId=${serverId}&search=AWS&paidBy=Credex`,
    ).expect(200);
    expect(combined.body.data.summary).toMatchObject({
      count: 1,
      expenseTotal: 5000,
    });

    const missed = await authGet(
      token,
      `/api/v1/reports/expenses?categoryId=${domainId}&search=AWS`,
    ).expect(200);
    expect(missed.body.data.summary.count).toBe(0);

    const existing = await authGet(token, '/api/v1/expenses?limit=10').expect(200);
    expect(existing.body.data.pagination.total).toBe(3);
    const legacy = await authGet(
      token,
      '/api/v1/expenses/reports?type=category-wise&from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(legacy.body.data.grandTotal).toBe(6200);

    const exported = await authFile(
      token,
      '/api/v1/reports/expenses/export?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(exported.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const workbook = await workbookFrom(exported);
    const cover = sheetText(workbook.getWorksheet('Report'));
    const details = sheetText(workbook.getWorksheet('Expenses'));
    const summary = sheetText(workbook.getWorksheet('Summary'));
    expect(cover).toContain('Expense report');
    expect(cover).toContain('2026-10-01 to 2026-10-31');
    expect(cover).toContain('6200');
    expect(details).toContain('AWS');
    expect(details).toContain('Domain renewal');
    expect(details).not.toContain('Old hosting');
    expect(summary).toContain('Server');
    expect(summary).toContain('Domain');
  });

  it('keeps voucher totals separate from settled disbursements', async () => {
    const token = await login();
    const first = await createVoucher(token, 600, 'Hosting part');
    const second = await createVoucher(token, 400, 'Support part');
    await createVoucher(token, 300, 'Client receipt', {
      voucherType: 'RECEIPT',
      payee: 'Client',
      paymentMode: 'CASH',
      referenceNumber: 'RCPT-9',
    });
    await createVoucher(token, 50, 'September voucher', {
      voucherDate: '2026-09-01',
    });

    const before = await authGet(
      token,
      '/api/v1/reports/vouchers?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(before.body.data.summary).toMatchObject({
      count: 3,
      voucherTotal: 1300,
      settledTotal: 0,
      outstandingTotal: 1300,
    });
    expect(before.body.data.summary.byType).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'PAYMENT', amount: 1000, count: 2 }),
        expect.objectContaining({ key: 'RECEIPT', amount: 300, count: 1 }),
      ]),
    );

    const payee = await authGet(
      token,
      '/api/v1/reports/vouchers?payee=Client&voucherType=RECEIPT&reference=RCPT-9',
    ).expect(200);
    expect(payee.body.data.summary).toMatchObject({
      count: 1,
      voucherTotal: 300,
    });
    expect(payee.body.data.items[0].expense).toBeNull();

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 1000,
        payee: 'Vendor',
        sourceAccount: 'SECRET-ACCOUNT-9999',
        chequeNumber: 'CHQ-55',
        chequeDate: '2026-10-11',
        allocations: [
          { voucherId: first.id, amount: 600 },
          { voucherId: second.id, amount: 400 },
        ],
      })
      .expect(201);

    const reserved = await authGet(
      token,
      '/api/v1/reports/vouchers?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(reserved.body.data.summary.settledTotal).toBe(0);
    expect(reserved.body.data.summary.outstandingTotal).toBe(1300);
    expect(JSON.stringify(reserved.body)).not.toContain('SECRET-ACCOUNT-9999');
  });

  it('counts each payment once and excludes issued, bounced, and cancelled payments from cleared totals', async () => {
    const token = await login();
    const first = await createVoucher(token, 600, 'Hosting part');
    const second = await createVoucher(token, 400, 'Support part');

    const created = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 1000,
        payee: 'Vendor',
        sourceAccount: 'SECRET-ACCOUNT-9999',
        chequeNumber: 'CHQ-55',
        chequeDate: '2026-10-11',
        allocations: [
          { voucherId: first.id, amount: 600 },
          { voucherId: second.id, amount: 400 },
        ],
      })
      .expect(201);
    const chequeId = created.body.data.id as string;

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-12',
        amount: 100,
        payee: 'Petty',
        allocations: [],
      })
      .expect(201);

    const cancelable = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-12',
        amount: 40,
        payee: 'Petty',
        allocations: [],
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${cancelable.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-11-02',
        amount: 25,
        payee: 'Vendor',
        sourceAccount: 'SBI-001',
        transferMethod: 'NEFT',
        referenceNumber: 'UTR998877',
        status: 'COMPLETED',
        allocations: [],
      })
      .expect(201);

    const october =
      '/api/v1/reports/payments?from=2026-10-01&to=2026-10-31';
    const issued = await authGet(token, october).expect(200);
    expect(issued.body.data.summary).toMatchObject({
      count: 3,
      recordedTotal: 1140,
      clearedTotal: 100,
      allocatedTotal: 1000,
      unallocatedTotal: 140,
    });
    expect(issued.body.data.summary.byMethod).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'CHEQUE',
          amount: 1000,
          clearedAmount: 0,
        }),
        expect.objectContaining({
          key: 'CASH',
          amount: 140,
          clearedAmount: 100,
        }),
      ]),
    );
    expect(issued.body.data.summary.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'ISSUED', amount: 1000 }),
        expect.objectContaining({ key: 'COMPLETED', amount: 100 }),
        expect.objectContaining({ key: 'CANCELLED', amount: 40 }),
      ]),
    );
    const chequeRow = issued.body.data.items.find(
      (item: { id: string }) => item.id === chequeId,
    );
    expect(chequeRow.countsAsCleared).toBe(false);
    expect(chequeRow.voucherReferences).toHaveLength(2);
    expect(chequeRow.allocatedAmount).toBe(1000);
    expect(JSON.stringify(issued.body)).not.toContain('SECRET-ACCOUNT-9999');

    const filtered = await authGet(
      token,
      `${october}&paymentMethod=CHEQUE&status=ISSUED&payee=Vendor&chequeNumber=CHQ-55`,
    ).expect(200);
    expect(filtered.body.data.summary).toMatchObject({
      count: 1,
      recordedTotal: 1000,
      clearedTotal: 0,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${chequeId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLEARED' })
      .expect(200);

    const cleared = await authGet(token, october).expect(200);
    expect(cleared.body.data.summary.clearedTotal).toBe(1100);
    expect(cleared.body.data.summary.recordedTotal).toBe(1140);

    const settledVouchers = await authGet(
      token,
      '/api/v1/reports/vouchers?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(settledVouchers.body.data.summary).toMatchObject({
      voucherTotal: 1000,
      settledTotal: 1000,
      outstandingTotal: 0,
    });

    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${chequeId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BOUNCED' })
      .expect(200);

    const bounced = await authGet(token, october).expect(200);
    expect(bounced.body.data.summary.clearedTotal).toBe(100);
    expect(bounced.body.data.summary.recordedTotal).toBe(1140);
    expect(bounced.body.data.summary.allocatedTotal).toBe(1000);
    expect(bounced.body.data.summary.byStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'BOUNCED', amount: 1000 }),
      ]),
    );
    const restored = await authGet(
      token,
      '/api/v1/reports/vouchers?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    expect(restored.body.data.summary).toMatchObject({
      settledTotal: 0,
      outstandingTotal: 1000,
    });

    const transfer = await authGet(
      token,
      '/api/v1/reports/payments?from=2026-11-02&to=2026-11-02&reference=UTR998877&paymentMethod=BANK_TRANSFER&status=COMPLETED',
    ).expect(200);
    expect(transfer.body.data.summary).toMatchObject({
      count: 1,
      recordedTotal: 25,
      clearedTotal: 25,
      allocatedTotal: 0,
      unallocatedTotal: 25,
    });
    expect(transfer.body.data.items[0].referenceNumber).toBe('UTR998877');

    const exported = await authFile(
      token,
      '/api/v1/reports/payments/export?from=2026-10-01&to=2026-10-31',
    ).expect(200);
    const workbook = await workbookFrom(exported);
    const cover = sheetText(workbook.getWorksheet('Report'));
    const allocations = sheetText(workbook.getWorksheet('Allocations'));
    expect(cover).toContain('1140');
    expect(cover).toContain('100');
    expect(cover).not.toContain('SECRET-ACCOUNT-9999');
    expect(allocations).toContain(first.voucherNumber);
    expect(allocations).toContain(second.voucherNumber);
    expect(allocations).toContain('600');
    expect(allocations).toContain('400');

    const list = await authGet(token, '/api/v1/payments?limit=10').expect(200);
    expect(list.body.data.pagination.total).toBe(4);
  });
});
