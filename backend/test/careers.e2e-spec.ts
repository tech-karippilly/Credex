import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { Career } from '../src/careers/schemas/career.schema';
import { EmailService } from '../src/email/email.service';
import './setup-env';

const fullCareerPayload = {
  title: 'Business & Sales Marketing Executive',
  location: 'Irinjalakuda, Kerala',
  employmentType: 'Full-time',
  experience: '2+ years',
  workplace: 'On-site',
  salary: '₹2–3 LPA',
  responsibilities: ['Generate leads', 'Manage client relationships'],
  requirements: ['2+ years of experience', 'Good communication skills'],
  goodToHave: ['NBFC experience'],
  order: 1,
};

describe('Careers (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let careerModel: Model<Career>;

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
      .useValue({
        uploadImage: jest.fn(),
        deleteAsset: jest.fn(),
      })
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
    careerModel = app.get<Model<Career>>(getModelToken(Career.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await careerModel.deleteMany({});
  });

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);

    return response.body.data.accessToken as string;
  }

  async function loginAsUser() {
    const adminToken = await loginAsAdmin();
    const email = `user-${Date.now()}@example.com`;
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

  async function createCareer(
    token: string,
    payload: Record<string, unknown> = fullCareerPayload,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/careers')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data;
  }

  describe('GET /api/v1/careers', () => {
    it('returns only visible careers sorted by order', async () => {
      const adminToken = await loginAsAdmin();
      const visibleSecond = await createCareer(adminToken, {
        ...fullCareerPayload,
        title: 'Second',
        order: 2,
      });
      await createCareer(adminToken, {
        ...fullCareerPayload,
        title: 'First',
        order: 1,
      });
      await createCareer(adminToken, {
        ...fullCareerPayload,
        title: 'Hidden',
        order: 3,
        isVisible: false,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/careers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Careers fetched successfully');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('First');
      expect(response.body.data[1].title).toBe('Second');
      expect(response.body.data[0]).not.toHaveProperty('isVisible');
      expect(response.body.data[1].id).toBe(visibleSecond.id);
    });

    it('returns an empty array when no visible careers exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/careers')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/careers/:id', () => {
    it('returns a visible career by id', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: created.id,
        title: fullCareerPayload.title,
        order: 1,
      });
      expect(response.body.data).not.toHaveProperty('isVisible');
    });

    it('returns 404 for a hidden career', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken, {
        ...fullCareerPayload,
        isVisible: false,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Career not found');
    });

    it('returns 404 for a missing career', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/careers/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.message).toBe('Career not found');
    });
  });

  describe('GET /api/v1/careers/admin', () => {
    it('returns all careers including hidden for admin', async () => {
      const adminToken = await loginAsAdmin();
      await createCareer(adminToken, { ...fullCareerPayload, order: 2 });
      await createCareer(adminToken, {
        ...fullCareerPayload,
        title: 'Hidden role',
        order: 1,
        isVisible: false,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/careers/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Hidden role');
      expect(response.body.data[0].isVisible).toBe(false);
      expect(response.body.data[1].isVisible).toBe(true);
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/careers/admin')
        .expect(401);
    });

    it('forbids normal users', async () => {
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .get('/api/v1/careers/admin')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/careers/admin/:id', () => {
    it('returns a hidden career for admin', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken, {
        ...fullCareerPayload,
        isVisible: false,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/careers/admin/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.isVisible).toBe(false);
      expect(response.body.data.title).toBe(fullCareerPayload.title);
    });

    it('returns 404 for a missing career', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .get('/api/v1/careers/admin/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .get(`/api/v1/careers/admin/${created.id}`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/api/v1/careers/admin/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/careers', () => {
    it('creates a career with default visibility', async () => {
      const adminToken = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(fullCareerPayload)
        .expect(201);

      expect(response.body.message).toBe('Career created successfully');
      expect(response.body.data).toMatchObject({
        title: fullCareerPayload.title,
        isVisible: true,
        responsibilities: fullCareerPayload.responsibilities,
        requirements: fullCareerPayload.requirements,
      });
    });

    it('respects explicit isVisible false', async () => {
      const adminToken = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...fullCareerPayload, isVisible: false })
        .expect(201);

      expect(response.body.data.isVisible).toBe(false);
    });

    it('normalizes newline-separated list fields', async () => {
      const adminToken = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...fullCareerPayload,
          responsibilities: 'Line one\nLine two\n\n',
          requirements: undefined,
          goodToHave: undefined,
        })
        .expect(201);

      expect(response.body.data.responsibilities).toEqual([
        'Line one',
        'Line two',
      ]);
      expect(response.body.data.requirements).toEqual([]);
      expect(response.body.data.goodToHave).toEqual([]);
    });

    it('validates required fields', async () => {
      const adminToken = await loginAsAdmin();
      const base = { ...fullCareerPayload };

      for (const field of [
        'title',
        'location',
        'employmentType',
        'experience',
        'workplace',
        'salary',
      ]) {
        const payload = { ...base };
        delete (payload as Record<string, unknown>)[field];
        await request(app.getHttpServer())
          .post('/api/v1/careers')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload)
          .expect(400);
      }

      await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...base, order: 0 })
        .expect(400);
    });

    it('rejects invalid array fields and unexpected properties', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...fullCareerPayload, responsibilities: [123] })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...fullCareerPayload, extraField: true })
        .expect(400);
    });

    it('rejects unauthenticated and non-admin users', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/careers')
        .send(fullCareerPayload)
        .expect(401);

      const userToken = await loginAsUser();
      await request(app.getHttpServer())
        .post('/api/v1/careers')
        .set('Authorization', `Bearer ${userToken}`)
        .send(fullCareerPayload)
        .expect(403);
    });
  });

  describe('PUT /api/v1/careers/:id', () => {
    it('updates a career partially', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);

      const response = await request(app.getHttpServer())
        .put(`/api/v1/careers/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Senior Executive',
          salary: '₹3–4 LPA',
          responsibilities: ['New task'],
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        title: 'Senior Executive',
        salary: '₹3–4 LPA',
        responsibilities: ['New task'],
        location: fullCareerPayload.location,
      });
    });

    it('returns 404 when career is missing', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .put('/api/v1/careers/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Missing' })
        .expect(404);
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .put(`/api/v1/careers/${created.id}`)
        .send({ title: 'No auth' })
        .expect(401);

      await request(app.getHttpServer())
        .put(`/api/v1/careers/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Forbidden' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/careers/:id/visibility', () => {
    it('toggles visibility and affects the public API', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);

      await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(200);

      const hideResponse = await request(app.getHttpServer())
        .patch(`/api/v1/careers/${created.id}/visibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVisible: false })
        .expect(200);

      expect(hideResponse.body.message).toBe(
        'Career visibility updated successfully',
      );
      expect(hideResponse.body.data).toEqual({
        id: created.id,
        isVisible: false,
      });

      await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(404);

      await request(app.getHttpServer())
        .get('/api/v1/careers')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
        });

      await request(app.getHttpServer())
        .patch(`/api/v1/careers/${created.id}/visibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVisible: true })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(200);
    });

    it('returns 404 for a missing career', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .patch('/api/v1/careers/507f1f77bcf86cd799439011/visibility')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVisible: true })
        .expect(404);
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .patch(`/api/v1/careers/${created.id}/visibility`)
        .send({ isVisible: false })
        .expect(401);

      await request(app.getHttpServer())
        .patch(`/api/v1/careers/${created.id}/visibility`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ isVisible: false })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/careers/:id', () => {
    it('deletes a career permanently', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);

      await request(app.getHttpServer())
        .delete(`/api/v1/careers/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/careers/${created.id}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/v1/careers/admin/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('returns 404 when career is missing', async () => {
      const adminToken = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .delete('/api/v1/careers/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toBe('Career not found');
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createCareer(adminToken);
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .delete(`/api/v1/careers/${created.id}`)
        .expect(401);

      await request(app.getHttpServer())
        .delete(`/api/v1/careers/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
