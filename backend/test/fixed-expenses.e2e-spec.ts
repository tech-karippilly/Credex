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
import { FixedExpense } from '../src/fixed-expenses/schemas/fixed-expense.schema';
import './setup-env';

describe('Fixed expenses (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let categoryModel: Model<ExpenseCategory>;
  let fixedModel: Model<FixedExpense>;
  let expenseModel: Model<Expense>;

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
      .useValue({ sendEmail: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(CloudinaryService)
      .useValue({
        uploadImage: jest.fn(),
        uploadDocument: jest.fn(),
        deleteAsset: jest.fn(),
      })
      .overrideProvider(AiService)
      .useValue({ generateText: jest.fn(), generateWithInlineData: jest.fn() })
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

    categoryModel = app.get(getModelToken(ExpenseCategory.name));
    fixedModel = app.get(getModelToken(FixedExpense.name));
    expenseModel = app.get(getModelToken(Expense.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await expenseModel.deleteMany({});
    await fixedModel.deleteMany({});
    await categoryModel.deleteMany({});
    await categoryModel.insertMany([
      {
        name: 'Server',
        nameNormalized: 'server',
        description: 'Hosting',
        isActive: true,
        order: 1,
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

  it('creates, lists, generates, and idempotently skips fixed expenses', async () => {
    const token = await login();
    const category = await categoryModel.findOne({ nameNormalized: 'server' });

    const createResponse = await request(app.getHttpServer())
      .post('/api/v1/fixed-expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        expenseName: 'Office rent',
        categoryId: category!._id.toString(),
        paidBy: 'Company',
        amount: 25000,
        dayOfMonth: 5,
        notes: 'Monthly rent',
      })
      .expect(201);

    expect(createResponse.body.data.expenseName).toBe('Office rent');
    expect(createResponse.body.data.amount).toBe(25000);

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/fixed-expenses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.totalMonthlyAmount).toBe(25000);

    const generateResponse = await request(app.getHttpServer())
      .post('/api/v1/fixed-expenses/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: '2026-04' })
      .expect(201);

    expect(generateResponse.body.data.created).toHaveLength(1);
    expect(generateResponse.body.data.created[0].date).toBe('2026-04-05');
    expect(generateResponse.body.data.created[0].generatedForMonth).toBe('2026-04');

    const expenses = await expenseModel.find().exec();
    expect(expenses).toHaveLength(1);

    const secondGenerate = await request(app.getHttpServer())
      .post('/api/v1/fixed-expenses/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ month: '2026-04' })
      .expect(201);

    expect(secondGenerate.body.data.created).toHaveLength(0);
    expect(secondGenerate.body.data.skipped).toHaveLength(1);
  });
});
