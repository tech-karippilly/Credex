import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
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
import { Payment } from '../src/payments/schemas/payment.schema';
import { PaymentAllocation } from '../src/payments/schemas/payment-allocation.schema';
import { Voucher } from '../src/vouchers/schemas/voucher.schema';
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import './setup-env';

describe('Payments (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
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
  });

  async function login(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);
    return response.body.data.accessToken as string;
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
    return response.body.data as {
      id: string;
      voucherNumber: string;
      amountPaid: number;
      outstandingAmount: number;
      settlementStatus: string;
      availableToAllocate: number;
    };
  }

  it('rejects unauthenticated payment requests', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments').expect(401);
  });

  it('allocates one cheque across vouchers and does not treat issue as cleared', async () => {
    const token = await login();
    const first = await createVoucher(token, 20000, 'Voucher one');
    const second = await createVoucher(token, 15000, 'Voucher two');
    const third = await createVoucher(token, 15000, 'Voucher three');

    const created = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 50000,
        payee: 'Vendor',
        sourceAccount: 'HDFC-123456789',
        chequeNumber: 'CHQ-10025',
        chequeDate: '2026-10-11',
        remarks: 'October disbursement',
        allocations: [
          { voucherId: first.id, amount: 20000 },
          { voucherId: second.id, amount: 15000 },
          { voucherId: third.id, amount: 15000 },
        ],
      })
      .expect(201);

    const payment = created.body.data;
    expect(payment.paymentNumber).toMatch(/^PAY-2026-\d{6}$/);
    expect(payment.status).toBe('ISSUED');
    expect(payment.allocatedAmount).toBe(50000);
    expect(payment.unallocatedAmount).toBe(0);
    expect(payment.linkedVoucherCount).toBe(3);
    expect(payment.audit[0].action).toBe('CREATED');
    const accountChange = payment.audit
      .flatMap((entry: { changes: { field: string; next: string }[] }) => entry.changes)
      .find((change: { field: string }) => change.field === 'sourceAccount');
    expect(accountChange.next).toMatch(/6789$/);
    expect(accountChange.next).not.toBe('HDFC-123456789');

    const issued = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${first.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(issued.body.data.amountPaid).toBe(0);
    expect(issued.body.data.outstandingAmount).toBe(20000);
    expect(issued.body.data.settlementStatus).toBe('UNPAID');
    expect(issued.body.data.availableToAllocate).toBe(0);
    expect(issued.body.data.status).toBe('COMPLETED');

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-11',
        amount: 1,
        payee: 'Vendor',
        allocations: [{ voucherId: first.id, amount: 1 }],
      })
      .expect(400);

    const cleared = await request(app.getHttpServer())
      .patch(`/api/v1/payments/${payment.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CLEARED' })
      .expect(200);
    expect(cleared.body.data.status).toBe('CLEARED');
    expect(cleared.body.data.id).toBe(payment.id);

    const paid = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${first.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(paid.body.data.amountPaid).toBe(20000);
    expect(paid.body.data.outstandingAmount).toBe(0);
    expect(paid.body.data.settlementStatus).toBe('PAID');

    await request(app.getHttpServer())
      .put(`/api/v1/payments/${payment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 40000, payee: 'Someone else' })
      .expect(400);

    const bounced = await request(app.getHttpServer())
      .patch(`/api/v1/payments/${payment.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'BOUNCED', note: 'Returned by bank' })
      .expect(200);
    expect(bounced.body.data.allocations).toHaveLength(3);
    expect(bounced.body.data.status).toBe('BOUNCED');

    const restored = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${second.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(restored.body.data.amountPaid).toBe(0);
    expect(restored.body.data.outstandingAmount).toBe(15000);
    expect(restored.body.data.settlementStatus).toBe('UNPAID');
    expect(restored.body.data.availableToAllocate).toBe(15000);
  });

  it('rejects allocations above the payment and above a voucher balance', async () => {
    const token = await login();
    const voucher = await createVoucher(token, 100, 'Small voucher');

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-11',
        amount: 80,
        payee: 'Vendor',
        allocations: [{ voucherId: voucher.id, amount: 81 }],
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-11',
        amount: 150,
        payee: 'Vendor',
        allocations: [{ voucherId: voucher.id, amount: 101 }],
      })
      .expect(400);
  });

  it('records bank transfers, cash, other methods, and partial settlement', async () => {
    const token = await login();
    const voucher = await createVoucher(token, 500, 'Partial voucher');

    const transfer = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-10-11',
        amount: 200,
        payee: 'Vendor',
        sourceAccount: 'SBI-001',
        transferMethod: 'NEFT',
        referenceNumber: 'UTR998877',
        allocations: [{ voucherId: voucher.id, amount: 200 }],
      })
      .expect(201);
    expect(transfer.body.data.referenceNumber).toBe('UTR998877');
    expect(transfer.body.data.status).toBe('INITIATED');

    let current = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(current.body.data.amountPaid).toBe(0);
    expect(current.body.data.settlementStatus).toBe('UNPAID');

    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${transfer.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const cash = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CASH',
        paymentDate: '2026-10-11',
        amount: 150,
        payee: 'Vendor',
        referenceNumber: 'CASH-1',
        allocations: [{ voucherId: voucher.id, amount: 150 }],
      })
      .expect(201);
    expect(cash.body.data.unallocatedAmount).toBe(0);
    expect(cash.body.data.allocatedAmount).toBe(150);

    const other = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'OTHER',
        paymentDate: '2026-10-11',
        amount: 150,
        payee: 'Vendor',
        referenceNumber: 'ADJ-1',
        allocations: [{ voucherId: voucher.id, amount: 150 }],
      })
      .expect(201);
    expect(other.body.data.status).toBe('COMPLETED');

    current = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(current.body.data.amountPaid).toBe(500);
    expect(current.body.data.outstandingAmount).toBe(0);
    expect(current.body.data.settlementStatus).toBe('PAID');

    const links = await request(app.getHttpServer())
      .get(`/api/v1/payments?voucherId=${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(links.body.data.items).toHaveLength(3);
  });

  it('edits an open payment in place and blocks a second full allocation', async () => {
    const token = await login();
    const first = await createVoucher(token, 100, 'First');
    const second = await createVoucher(token, 80, 'Second');

    const created = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 40,
        payee: 'Vendor',
        sourceAccount: 'HDFC-1',
        chequeNumber: 'CHQ-200',
        chequeDate: '2026-10-11',
        allocations: [{ voucherId: first.id, amount: 40 }],
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .put(`/api/v1/payments/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 50,
        payee: 'Vendor',
        sourceAccount: 'HDFC-1',
        chequeNumber: 'CHQ-200',
        chequeDate: '2026-10-11',
        paymentDate: '2026-10-11',
        allocations: [
          { voucherId: first.id, amount: 20 },
          { voucherId: second.id, amount: 30 },
        ],
      })
      .expect(200);

    expect(updated.body.data.id).toBe(created.body.data.id);
    expect(updated.body.data.paymentNumber).toBe(created.body.data.paymentNumber);
    expect(updated.body.data.allocatedAmount).toBe(50);
    expect(updated.body.data.unallocatedAmount).toBe(0);
    expect(await paymentModel.countDocuments()).toBe(1);

    const reloaded = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${first.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(reloaded.body.data.availableToAllocate).toBe(80);
    expect(reloaded.body.data.amountPaid).toBe(0);

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 100,
        payee: 'Vendor',
        sourceAccount: 'HDFC-1',
        chequeNumber: 'CHQ-200',
        chequeDate: '2026-10-12',
        allocations: [],
      })
      .expect(409);
  });

  it('cancels an issued cheque without deleting it and keeps voucher creation working', async () => {
    const token = await login();
    const voucher = await createVoucher(token, 40, 'Cancel me');
    const created = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'CHEQUE',
        paymentDate: '2026-10-11',
        amount: 40,
        payee: 'Vendor',
        sourceAccount: 'ICICI-9',
        chequeNumber: 'CHQ-9',
        chequeDate: '2026-10-11',
        allocations: [{ voucherId: voucher.id, amount: 40 }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/payments/${created.body.data.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    const restored = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(restored.body.data.availableToAllocate).toBe(40);
    expect(restored.body.data.settlementStatus).toBe('UNPAID');
    expect(await paymentModel.countDocuments()).toBe(1);
    expect(await allocationModel.countDocuments()).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);

    const fresh = await createVoucher(token, 25, 'Still works', {
      paymentMode: 'CASH',
      status: 'DRAFT',
    });
    expect(fresh.settlementStatus).toBe('UNPAID');
    expect(fresh.amountPaid).toBe(0);

    const edited = await request(app.getHttpServer())
      .put(`/api/v1/vouchers/${fresh.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Renamed draft', amount: 30 })
      .expect(200);
    expect(edited.body.data.title).toBe('Renamed draft');
    expect(edited.body.data.voucherNumber).toBe(fresh.voucherNumber);
  });

  it('does not invent payments for historical vouchers and can settle them later', async () => {
    const token = await login();
    await voucherModel.collection.insertOne({
      voucherNumber: 'VCH-OLD-1',
      voucherDate: new Date('2020-01-15T00:00:00.000Z'),
      voucherType: 'PAYMENT',
      title: 'Historical',
      description: '',
      paidBy: 'Credex',
      payee: 'Old vendor',
      amountPaise: 250000,
      currency: 'INR',
      paymentMode: 'CASH',
      referenceNumber: '',
      notes: '',
      document: null,
      status: 'COMPLETED',
      createdAt: new Date('2020-01-15T00:00:00.000Z'),
      updatedAt: new Date('2020-01-15T00:00:00.000Z'),
    });

    const listed = await request(app.getHttpServer())
      .get('/api/v1/vouchers?search=VCH-OLD-1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const historical = listed.body.data.items[0];
    expect(historical.amountPaid).toBe(0);
    expect(historical.outstandingAmount).toBe(2500);
    expect(historical.settlementStatus).toBe('UNPAID');
    expect(historical.paymentMode).toBe('CASH');

    const payments = await request(app.getHttpServer())
      .get(`/api/v1/payments?voucherId=${historical.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(payments.body.data.items).toEqual([]);

    const settled = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMethod: 'UPI',
        paymentDate: '2026-10-11',
        amount: 1000,
        payee: 'Old vendor',
        referenceNumber: 'UPI-1',
        allocations: [{ voucherId: historical.id, amount: 1000 }],
      })
      .expect(201);

    expect(settled.body.data.unallocatedAmount).toBe(0);
    const after = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${historical.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.data.settlementStatus).toBe('PARTIALLY_PAID');
    expect(after.body.data.amountPaid).toBe(1000);
    expect(after.body.data.outstandingAmount).toBe(1500);
  });

  it('allows only one of two concurrent allocations to reserve the same balance', async () => {
    const token = await login();
    const voucher = await createVoucher(token, 100, 'Contended');
    const body = {
      paymentMethod: 'CASH',
      paymentDate: '2026-10-11',
      amount: 100,
      payee: 'Vendor',
      allocations: [{ voucherId: voucher.id, amount: 100 }],
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
      request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${token}`)
        .send(body),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 400]);
    expect(await paymentModel.countDocuments()).toBe(1);

    const after = await request(app.getHttpServer())
      .get(`/api/v1/vouchers/${voucher.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.data.amountPaid).toBe(100);
    expect(after.body.data.availableToAllocate).toBe(0);
  });
});
