import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
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
import { WhatsappService } from '../src/whatsapp/whatsapp.service';
import { ExpenseCategory } from '../src/expense-categories/schemas/expense-category.schema';
import { Expense } from '../src/expenses/schemas/expense.schema';
import { Voucher } from '../src/vouchers/schemas/voucher.schema';
import './setup-env';

describe('Vouchers (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let voucherModel: Model<Voucher>;
  let expenseModel: Model<Expense>;
  let categoryModel: Model<ExpenseCategory>;

  const cloudinaryService = {
    uploadImage: jest.fn(),
    uploadDocument: jest.fn(),
    deleteAsset: jest.fn(),
  };

  const aiService = {
    generateText: jest.fn(),
    generateWithInlineData: jest.fn(),
  };

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };

  const emailService = {
    sendEmail: jest.fn().mockResolvedValue({ id: 'email_mock_id' }),
  };

  const whatsappService = {
    isConfigured: jest.fn().mockReturnValue(true),
    assertConfigured: jest.fn(),
    sendVoucherMessage: jest
      .fn()
      .mockResolvedValue({ messageId: 'wamid.mock', status: 'ACCEPTED' }),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
      .overrideProvider(WhatsappService)
      .useValue(whatsappService)
      .overrideProvider(CloudinaryService)
      .useValue(cloudinaryService)
      .overrideProvider(AiService)
      .useValue(aiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    voucherModel = app.get<Model<Voucher>>(getModelToken(Voucher.name));
    expenseModel = app.get<Model<Expense>>(getModelToken(Expense.name));
    categoryModel = app.get<Model<ExpenseCategory>>(
      getModelToken(ExpenseCategory.name),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
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
        name: 'Inactive',
        nameNormalized: 'inactive',
        description: 'Inactive',
        isActive: false,
        order: 2,
      },
    ]);
    jest.clearAllMocks();
    cloudinaryService.uploadImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/image/upload/doc.jpg',
      publicId: 'credex/vouchers/mock',
    });
    cloudinaryService.uploadDocument.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/raw/upload/doc.pdf',
      publicId: 'credex/vouchers/mock',
    });
    cloudinaryService.deleteAsset.mockResolvedValue(undefined);
  });

  async function loginAsAdmin(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);

    return response.body.data.accessToken as string;
  }

  async function categoryIdByName(token: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .get('/api/v1/expense-categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const match = response.body.data.find(
      (row: { name: string }) => row.name === name,
    );
    if (!match) {
      throw new Error(`Category not found: ${name}`);
    }

    return match.id as string;
  }

  async function createExpense(token: string, categoryId: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        expenseName: 'AWS Hosting',
        categoryId,
        paidBy: 'Vishnu KV',
        amount: 5000,
        date: '2026-10-08',
      })
      .expect(201);

    return response.body.data;
  }

  function voucherPayload(overrides: Record<string, unknown> = {}) {
    return {
      voucherDate: '2026-10-08',
      voucherType: 'PAYMENT',
      title: 'AWS Hosting Payment',
      description: 'October hosting payment',
      paidBy: 'Vishnu KV',
      payee: 'AWS',
      amount: 5000,
      paymentMode: 'BANK_TRANSFER',
      referenceNumber: 'UTR123456',
      notes: 'Monthly hosting payment',
      ...overrides,
    };
  }

  describe('auth', () => {
    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/api/v1/vouchers').expect(401);
    });
  });

  describe('CRUD and listing', () => {
    it('creates voucher with generated number and validates relations', async () => {
      const token = await loginAsAdmin();
      const categoryId = await categoryIdByName(token, 'Server');
      const expense = await createExpense(token, categoryId);

      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(
          voucherPayload({
            categoryId,
            expenseId: expense.id,
            voucherDate: '2026-10-20',
          }),
        )
        .expect(201);

      expect(created.body.data.voucherNumber).toMatch(/^VCH-2026-\d{6}$/);
      expect(created.body.data.amount).toBe(5000);
      expect(created.body.data.category.name).toBe('Server');
      expect(created.body.data.expense.expenseName).toBe('AWS Hosting');
      // Voucher date stays independent of the linked expense invoice date.
      expect(created.body.data.voucherDate).toBe('2026-10-20');
      expect(created.body.data.expense.invoiceDate).toBe('2026-10-08');
      expect(expense.invoiceDate).toBe('2026-10-08');

      const second = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload({ title: 'Second voucher' }))
        .expect(201);

      expect(second.body.data.voucherNumber).not.toBe(
        created.body.data.voucherNumber,
      );

      const list = await request(app.getHttpServer())
        .get('/api/v1/vouchers?search=AWS')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(list.body.data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('rejects invalid amount and inactive category', async () => {
      const token = await loginAsAdmin();
      const inactive = await categoryModel.findOne({ name: 'Inactive' }).exec();
      const inactiveId = inactive?._id.toString();
      if (!inactiveId) {
        throw new Error('Inactive category seed missing');
      }

      await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload({ amount: 0 }))
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload({ categoryId: inactiveId }))
        .expect(400);
    });

    it('returns 404 for missing expense', async () => {
      const token = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(
          voucherPayload({
            expenseId: '507f1f77bcf86cd799439011',
          }),
        )
        .expect(404);
    });

    it('updates voucher without changing voucher number', async () => {
      const token = await loginAsAdmin();
      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload())
        .expect(201);

      const voucherNumber = created.body.data.voucherNumber;

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/vouchers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated title', amount: 6000 })
        .expect(200);

      expect(updated.body.data.title).toBe('Updated title');
      expect(updated.body.data.amount).toBe(6000);
      expect(updated.body.data.voucherNumber).toBe(voucherNumber);
      expect(updated.body.data.status).toBe(created.body.data.status);
    });

    it('edits a draft without a new number, status change, or duplicate', async () => {
      const token = await loginAsAdmin();
      const categoryId = await categoryIdByName(token, 'Server');
      const expense = await createExpense(token, categoryId);

      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(
          voucherPayload({
            status: 'DRAFT',
            categoryId,
            expenseId: expense.id,
          }),
        )
        .expect(201);

      const updatedExpense = await request(app.getHttpServer())
        .put(`/api/v1/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ expenseName: 'AWS Hosting Renamed', amount: 5100 })
        .expect(200);

      expect(updatedExpense.body.data.id).toBe(expense.id);

      const afterExpenseEdit = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(afterExpenseEdit.body.data.expenseId).toBe(expense.id);
      expect(afterExpenseEdit.body.data.expense.expenseName).toBe(
        'AWS Hosting Renamed',
      );
      expect(afterExpenseEdit.body.data.voucherNumber).toBe(
        created.body.data.voucherNumber,
      );
      expect(afterExpenseEdit.body.data.status).toBe('DRAFT');

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/vouchers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          voucherDate: '2026-10-09',
          title: 'Updated hosting',
          payee: 'Amazon',
          amount: 5100,
          paymentMode: 'UPI',
          referenceNumber: 'UTR999',
          notes: 'Edited note',
          expenseId: expense.id,
        })
        .expect(200);

      expect(updated.body.data.id).toBe(created.body.data.id);
      expect(updated.body.data.voucherNumber).toBe(
        created.body.data.voucherNumber,
      );
      expect(updated.body.data.status).toBe('DRAFT');
      expect(updated.body.data.expenseId).toBe(expense.id);
      expect(updated.body.data.amount).toBe(5100);
      expect(updated.body.data.voucherDate).toBe('2026-10-09');
      expect(updated.body.data.expense.invoiceDate).toBe(
        updatedExpense.body.data.invoiceDate,
      );
      expect(updated.body.data.paymentMode).toBe('UPI');
      expect(updated.body.data.payee).toBe('Amazon');
      expect(updated.body.data.referenceNumber).toBe('UTR999');
      expect(updated.body.data.notes).toBe('Edited note');

      const list = await request(app.getHttpServer())
        .get('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.data.pagination.total).toBe(1);
    });

    it('keeps a completed voucher number and status when details change', async () => {
      const token = await loginAsAdmin();
      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload())
        .expect(201);

      expect(created.body.data.status).toBe('COMPLETED');

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/vouchers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Still completed', amount: 10 })
        .expect(200);

      expect(updated.body.data.status).toBe('COMPLETED');
      expect(updated.body.data.voucherNumber).toBe(
        created.body.data.voucherNumber,
      );
      expect(updated.body.data.title).toBe('Still completed');
    });

    it('updates status via patch', async () => {
      const token = await loginAsAdmin();
      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload({ status: 'DRAFT' }))
        .expect(201);

      const patched = await request(app.getHttpServer())
        .patch(`/api/v1/vouchers/${created.body.data.id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(patched.body.data.status).toBe('COMPLETED');
    });

    it('deletes voucher and linked expense remains', async () => {
      const token = await loginAsAdmin();
      const categoryId = await categoryIdByName(token, 'Server');
      const expense = await createExpense(token, categoryId);

      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload({ expenseId: expense.id }))
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/vouchers/${created.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/expenses/${expense.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('filters', () => {
    it('filters by type, status, category, and date range', async () => {
      const token = await loginAsAdmin();
      const categoryId = await categoryIdByName(token, 'Server');

      await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(
          voucherPayload({
            categoryId,
            voucherType: 'RECEIPT',
            status: 'DRAFT',
            voucherDate: '2026-10-01',
          }),
        )
        .expect(201);

      const filtered = await request(app.getHttpServer())
        .get(
          '/api/v1/vouchers?voucherType=RECEIPT&status=DRAFT&categoryId=' +
            categoryId +
            '&from=2026-10-01&to=2026-10-31',
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(filtered.body.data.items).toHaveLength(1);
    });
  });

  async function loginAsUser(): Promise<string> {
    const adminToken = await loginAsAdmin();
    const email = `voucher-user-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Regular User',
        email,
        password: 'SecurePassword123',
      })
      .expect(201);

    const session = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'SecurePassword123' })
      .expect(201);

    return session.body.data.accessToken as string;
  }

  async function createVoucher(token: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/vouchers')
      .set('Authorization', `Bearer ${token}`)
      .send(voucherPayload())
      .expect(201);

    return response.body.data;
  }

  describe('sharing', () => {
    it('sends voucher email with pdf attachment', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-email`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'recipient@example.com',
          message: 'Please find the voucher attached.',
        })
        .expect(201);

      expect(response.body.data.deliveryAttempt).toMatchObject({
        channel: 'EMAIL',
        recipient: 'recipient@example.com',
        status: 'ACCEPTED',
      });
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = emailService.sendEmail.mock.calls[0][0];
      expect(emailArgs.to).toBe('recipient@example.com');
      expect(emailArgs.attachments?.[0]?.filename).toContain('VCH-');

      const fetched = await request(app.getHttpServer())
        .get(`/api/v1/vouchers/${voucher.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(fetched.body.data.status).toBe(voucher.status);
    });

    it('rejects invalid email and missing voucher', async () => {
      const token = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/vouchers/507f1f77bcf86cd799439011/send-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'not-an-email' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/vouchers/507f1f77bcf86cd799439011/send-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'valid@example.com' })
        .expect(404);
    });

    it('records email failure when Resend fails', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);
      emailService.sendEmail.mockRejectedValueOnce(new Error('Resend failed'));

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-email`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'recipient@example.com' })
        .expect(500);
    });

    it('sends voucher WhatsApp message', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-whatsapp`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          phone: '+919876543210',
          message: 'Please find the voucher details.',
        })
        .expect(201);

      expect(response.body.data.deliveryAttempt).toMatchObject({
        channel: 'WHATSAPP',
        recipient: '+919876543210',
        status: 'ACCEPTED',
        providerMessageId: 'wamid.mock',
      });
      expect(whatsappService.sendVoucherMessage).toHaveBeenCalled();
    });

    it('rejects invalid phone number', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-whatsapp`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '9876543210' })
        .expect(400);
    });

    it('returns 503 when WhatsApp is not configured', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);
      whatsappService.assertConfigured.mockImplementationOnce(() => {
        throw new ServiceUnavailableException('WhatsApp is not configured');
      });

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-whatsapp`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+919876543210' })
        .expect(503);
    });

    it('records WhatsApp failure when provider fails', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);
      whatsappService.sendVoucherMessage.mockRejectedValueOnce(
        new Error('WhatsApp provider failed'),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-whatsapp`)
        .set('Authorization', `Bearer ${token}`)
        .send({ phone: '+919876543210' })
        .expect(500);
    });

    it('rejects unauthenticated and non-admin sharing', async () => {
      const token = await loginAsAdmin();
      const voucher = await createVoucher(token);
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-email`)
        .send({ email: 'recipient@example.com' })
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${voucher.id}/send-email`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ email: 'recipient@example.com' })
        .expect(403);
    });
  });

  describe('documents', () => {
    it('uploads and deletes voucher document', async () => {
      const token = await loginAsAdmin();
      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload())
        .expect(201);

      const uploaded = await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${created.body.data.id}/document`)
        .set('Authorization', `Bearer ${token}`)
        .attach('document', Buffer.from('%PDF-1.4'), {
          filename: 'voucher.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(uploaded.body.data.document?.fileName).toBe('voucher.pdf');

      const removed = await request(app.getHttpServer())
        .delete(`/api/v1/vouchers/${created.body.data.id}/document`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(removed.body.data.document).toBeNull();
      expect(cloudinaryService.deleteAsset).toHaveBeenCalled();
    });

    it('rejects invalid document type', async () => {
      const token = await loginAsAdmin();
      const created = await request(app.getHttpServer())
        .post('/api/v1/vouchers')
        .set('Authorization', `Bearer ${token}`)
        .send(voucherPayload())
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/vouchers/${created.body.data.id}/document`)
        .set('Authorization', `Bearer ${token}`)
        .attach('document', Buffer.from('plain text'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });
});
