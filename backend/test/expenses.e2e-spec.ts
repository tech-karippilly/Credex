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
import { ExpenseCategory } from '../src/expense-categories/schemas/expense-category.schema';
import { Expense } from '../src/expenses/schemas/expense.schema';
import './setup-env';

describe('Expenses (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
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

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri();

    const emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(emailService)
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

    expenseModel = app.get<Model<Expense>>(getModelToken(Expense.name));
    categoryModel = app.get<Model<ExpenseCategory>>(
      getModelToken(ExpenseCategory.name),
    );
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
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
    jest.clearAllMocks();
    cloudinaryService.uploadImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/image/upload/receipt.jpg',
      publicId: 'credex/expenses/mock',
    });
    cloudinaryService.uploadDocument.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/raw/upload/receipt.pdf',
      publicId: 'credex/expenses/mock',
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

  async function createExpense(
    token: string,
    overrides: Record<string, unknown> = {},
  ) {
    const categoryId =
      (overrides.categoryId as string | undefined) ??
      (await categoryIdByName(token, 'Server'));

    const payload = {
      expenseName: 'AWS Hosting - October',
      categoryId,
      paidBy: 'Vishnu KV',
      amount: 5000,
      date: '2026-10-08',
      notes: 'Monthly hosting',
      ...overrides,
    };
    delete (payload as { category?: string }).category;

    const response = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data;
  }

  describe('CRUD and listing', () => {
    it('creates, lists, updates, and deletes expenses for admin', async () => {
      const token = await loginAsAdmin();
      const created = await createExpense(token);

      expect(created.expenseName).toBe('AWS Hosting - October');
      expect(created.amount).toBe(5000);
      expect(created.currency).toBe('INR');

      const list = await request(app.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.data.items).toHaveLength(1);
      expect(list.body.data.totalAmount).toBe(5000);
      expect(list.body.data.pagination.total).toBe(1);

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/expenses/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5500 })
        .expect(200);

      expect(updated.body.data.amount).toBe(5500);

      await request(app.getHttpServer())
        .delete(`/api/v1/expenses/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('updates fields without dropping the receipt or creating another expense', async () => {
      const token = await loginAsAdmin();
      const created = await createExpense(token);

      await expenseModel.findByIdAndUpdate(created.id, {
        receipt: {
          url: 'https://res.cloudinary.com/test/image/upload/receipt.jpg',
          publicId: 'credex/expenses/mock',
          fileName: 'receipt.jpg',
          mimeType: 'image/jpeg',
        },
      });

      const updated = await request(app.getHttpServer())
        .put(`/api/v1/expenses/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: 'AWS Hosting Renamed',
          amount: 42.5,
          notes: 'Edited',
        })
        .expect(200);

      expect(updated.body.data.id).toBe(created.id);
      expect(updated.body.data.expenseName).toBe('AWS Hosting Renamed');
      expect(updated.body.data.amount).toBe(42.5);
      expect(updated.body.data.notes).toBe('Edited');
      expect(updated.body.data.receipt.fileName).toBe('receipt.jpg');

      await request(app.getHttpServer())
        .put(`/api/v1/expenses/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 0 })
        .expect(400);

      const list = await request(app.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list.body.data.pagination.total).toBe(1);
      expect(list.body.data.items[0].id).toBe(created.id);
      expect(list.body.data.items[0].amount).toBe(42.5);
      expect(list.body.data.items[0].receipt.fileName).toBe('receipt.jpg');
    });

    it('rejects creating expenses with inactive categories', async () => {
      const token = await loginAsAdmin();
      const inactive = await categoryModel.create({
        name: 'Archived',
        nameNormalized: 'archived',
        isActive: false,
        order: 99,
      });

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: 'Old expense',
          categoryId: inactive._id.toString(),
          paidBy: 'Vishnu KV',
          amount: 100,
          date: '2026-10-08',
        })
        .expect(400);
    });

    it('rejects invalid create payload and unexpected fields', async () => {
      const token = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: '',
          categoryId: await categoryIdByName(token, 'Server'),
          paidBy: 'Vishnu KV',
          amount: 5000,
          date: '2026-10-08',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: 'Test',
          categoryId: await categoryIdByName(token, 'Server'),
          paidBy: 'Vishnu KV',
          amount: 0,
          date: '2026-10-08',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          expenseName: 'Test',
          categoryId: await categoryIdByName(token, 'Server'),
          paidBy: 'Vishnu KV',
          amount: 5000,
          date: '2026-10-08',
          hackerField: true,
        })
        .expect(400);
    });

    it('filters by category, month, search and computes totalAmount across pages', async () => {
      const token = await loginAsAdmin();
      const serverCategoryId = await categoryIdByName(token, 'Server');
      await createExpense(token, {
        expenseName: 'AWS Hosting',
        categoryId: serverCategoryId,
        amount: 5000,
        date: '2026-10-08',
      });
      await createExpense(token, {
        expenseName: 'Domain Renewal',
        categoryId: await categoryIdByName(token, 'Domain'),
        amount: 1200,
        date: '2026-10-09',
      });

      const serverOnly = await request(app.getHttpServer())
        .get(`/api/v1/expenses?categoryId=${serverCategoryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(serverOnly.body.data.items).toHaveLength(1);
      expect(serverOnly.body.data.totalAmount).toBe(5000);

      const month = await request(app.getHttpServer())
        .get('/api/v1/expenses?month=2026-10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(month.body.data.totalAmount).toBe(6200);

      const search = await request(app.getHttpServer())
        .get('/api/v1/expenses?search=Domain')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(search.body.data.items).toHaveLength(1);
    });
  });

  describe('Receipts', () => {
    it('uploads, replaces, and deletes receipts', async () => {
      const token = await loginAsAdmin();
      const created = await createExpense(token);

      const upload = await request(app.getHttpServer())
        .post(`/api/v1/expenses/${created.id}/receipt`)
        .set('Authorization', `Bearer ${token}`)
        .attach('receipt', Buffer.from('fake-image'), {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(upload.body.data.receipt.fileName).toBe('receipt.jpg');
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();

      await request(app.getHttpServer())
        .post(`/api/v1/expenses/${created.id}/receipt`)
        .set('Authorization', `Bearer ${token}`)
        .attach('receipt', Buffer.from('fake-pdf'), {
          filename: 'receipt.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(cloudinaryService.uploadDocument).toHaveBeenCalled();
      expect(cloudinaryService.deleteAsset).toHaveBeenCalled();

      const removed = await request(app.getHttpServer())
        .delete(`/api/v1/expenses/${created.id}/receipt`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(removed.body.data.receipt).toBeNull();
    });

    it('rejects unsupported receipt files', async () => {
      const token = await loginAsAdmin();
      const created = await createExpense(token);

      await request(app.getHttpServer())
        .post(`/api/v1/expenses/${created.id}/receipt`)
        .set('Authorization', `Bearer ${token}`)
        .attach('receipt', Buffer.from('text'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('Gemini receipt analysis', () => {
    it('returns extracted fields without creating an expense', async () => {
      const token = await loginAsAdmin();
      aiService.generateWithInlineData.mockResolvedValue(
        JSON.stringify({
          expenseName: 'AWS Hosting',
          category: 'Server',
          paidBy: null,
          amount: 5000,
          date: '2026-10-08',
          notes: 'Hosting',
          confidence: 0.9,
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses/receipt/analyze')
        .set('Authorization', `Bearer ${token}`)
        .attach('receipt', Buffer.from('fake-image'), {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.data.expenseName).toBe('AWS Hosting');
      expect(response.body.data.categoryName).toBe('Server');
      expect(response.body.data.categoryId).toBeTruthy();
      expect(response.body.data.paidBy).toBeNull();

      const count = await expenseModel.countDocuments();
      expect(count).toBe(0);
    });

    it('handles Gemini failures safely', async () => {
      const token = await loginAsAdmin();
      aiService.generateWithInlineData.mockRejectedValue(new Error('Gemini down'));

      const response = await request(app.getHttpServer())
        .post('/api/v1/expenses/receipt/analyze')
        .set('Authorization', `Bearer ${token}`)
        .attach('receipt', Buffer.from('fake-image'), {
          filename: 'receipt.jpg',
          contentType: 'image/jpeg',
        })
        .expect(502);

      expect(response.body.message).toBe(
        'Unable to extract expense details from the receipt',
      );
    });
  });

  describe('Reports and Excel', () => {
    it('generates date-wise, month-wise, and category-wise reports', async () => {
      const token = await loginAsAdmin();
      await createExpense(token, {
        expenseName: 'AWS',
        categoryId: await categoryIdByName(token, 'Server'),
        amount: 5000,
        date: '2026-10-01',
      });
      await createExpense(token, {
        expenseName: 'Domain',
        categoryId: await categoryIdByName(token, 'Domain'),
        amount: 1200,
        date: '2026-10-02',
      });

      const dateWise = await request(app.getHttpServer())
        .get(
          '/api/v1/expenses/reports?type=date-wise&from=2026-10-01&to=2026-10-31',
        )
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(dateWise.body.data.grandTotal).toBe(6200);
      expect(dateWise.body.data.rows.length).toBeGreaterThanOrEqual(2);

      const monthWise = await request(app.getHttpServer())
        .get('/api/v1/expenses/reports?type=month-wise&month=2026-10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(monthWise.body.data.grandTotal).toBe(6200);

      const categoryWise = await request(app.getHttpServer())
        .get('/api/v1/expenses/reports?type=category-wise')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(categoryWise.body.data.grandTotal).toBe(6200);
    });

    it('exports Excel with correct content type', async () => {
      const token = await loginAsAdmin();
      await createExpense(token);

      const response = await request(app.getHttpServer())
        .get('/api/v1/expenses/reports/export?type=category-wise')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(response.body.length).toBeGreaterThan(100);
    });
  });

  it('requires admin authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/expenses').expect(401);
  });
});
