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
import { EmailService } from '../src/email/email.service';
import { Service } from '../src/services/schemas/service.schema';
import './setup-env';

describe('Services (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let serviceModel: Model<Service>;
  const cloudinaryService = {
    uploadImage: jest.fn(),
    deleteAsset: jest.fn(),
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
    serviceModel = app.get<Model<Service>>(getModelToken(Service.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await serviceModel.deleteMany({});
    jest.clearAllMocks();
    cloudinaryService.uploadImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/image/upload/v1/credex/services/mock.jpg',
      publicId: 'credex/services/mock',
    });
    cloudinaryService.deleteAsset.mockResolvedValue(undefined);
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

  async function createService(
    token: string,
    payload: {
      title: string;
      description: string;
      icon?: string;
      order: number;
    },
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/services')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data;
  }

  describe('GET /api/v1/services', () => {
    it('returns services sorted by order without authentication', async () => {
      const adminToken = await loginAsAdmin();
      await createService(adminToken, {
        title: 'Second',
        description: 'Second service',
        order: 2,
      });
      await createService(adminToken, {
        title: 'First',
        description: 'First service',
        order: 1,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/services')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Services fetched successfully');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('First');
      expect(response.body.data[1].title).toBe('Second');
      expect(response.body.data[0]).toMatchObject({
        id: expect.any(String),
        title: 'First',
        description: 'First service',
        image: null,
        order: 1,
      });
    });

    it('returns an empty array when no services exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/services')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('returns a service by id', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Consulting',
        description: 'IT consulting services',
        icon: 'briefcase',
        order: 3,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/services/${created.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({
        id: created.id,
        title: 'Consulting',
        description: 'IT consulting services',
        icon: 'briefcase',
        image: null,
        order: 3,
      });
    });

    it('returns 404 for a missing service', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/services/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Service not found');
    });
  });

  describe('POST /api/v1/services', () => {
    it('creates a service for admin', async () => {
      const adminToken = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Custom Software Development',
          description:
            'Build scalable software tailored to your business requirements.',
          icon: 'code',
          order: 1,
        })
        .expect(201);

      expect(response.body.message).toBe('Service created successfully');
      expect(response.body.data).toMatchObject({
        title: 'Custom Software Development',
        description:
          'Build scalable software tailored to your business requirements.',
        icon: 'code',
        image: null,
        order: 1,
      });
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/services')
        .send({
          title: 'Blocked',
          description: 'Should fail',
          order: 1,
        })
        .expect(401);
    });

    it('forbids normal users', async () => {
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Blocked',
          description: 'Should fail',
          order: 1,
        })
        .expect(403);
    });

    it('validates required fields', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing title',
          order: 1,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Missing description',
          order: 1,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Invalid order',
          description: 'Bad order',
          order: 0,
        })
        .expect(400);
    });

    it('rejects unexpected fields', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Valid',
          description: 'Valid description',
          order: 1,
          image: { url: 'https://evil.example' },
        })
        .expect(400);
    });
  });

  describe('PUT /api/v1/services/:id', () => {
    it('updates a service partially for admin', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Original',
        description: 'Original description',
        icon: 'code',
        order: 1,
      });

      const response = await request(app.getHttpServer())
        .put(`/api/v1/services/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated description' })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: created.id,
        title: 'Original',
        description: 'Updated description',
        icon: 'code',
        order: 1,
      });
    });

    it('returns 404 when service is missing', async () => {
      const adminToken = await loginAsAdmin();

      await request(app.getHttpServer())
        .put('/api/v1/services/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Missing' })
        .expect(404);
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Protected',
        description: 'Protected service',
        order: 1,
      });
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .put(`/api/v1/services/${created.id}`)
        .send({ title: 'No auth' })
        .expect(401);

      await request(app.getHttpServer())
        .put(`/api/v1/services/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Forbidden' })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/services/:id', () => {
    it('deletes a service and its Cloudinary image', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Delete me',
        description: 'Temporary service',
        order: 9,
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-image'), {
          filename: 'service.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      cloudinaryService.uploadImage.mockClear();
      cloudinaryService.deleteAsset.mockClear();

      await request(app.getHttpServer())
        .delete(`/api/v1/services/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(cloudinaryService.deleteAsset).toHaveBeenCalled();

      await request(app.getHttpServer())
        .get(`/api/v1/services/${created.id}`)
        .expect(404);
    });

    it('requires admin authentication', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Protected delete',
        description: 'Protected service',
        order: 1,
      });
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .delete(`/api/v1/services/${created.id}`)
        .expect(401);

      await request(app.getHttpServer())
        .delete(`/api/v1/services/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('POST /api/v1/services/:id/image', () => {
    it('uploads JPG and PNG images for admin', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'With image',
        description: 'Service with image',
        order: 4,
      });

      const jpgResponse = await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-jpg'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(cloudinaryService.uploadImage).toHaveBeenCalled();
      expect(jpgResponse.body.data.image).toEqual({
        url: 'https://res.cloudinary.com/test/image/upload/v1/credex/services/mock.jpg',
        publicId: 'credex/services/mock',
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-png'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(201);
    });

    it('rejects unsupported files and oversized uploads', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Image validation',
        description: 'Validation service',
        order: 5,
      });
      const userToken = await loginAsUser();

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('not-an-image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', oversized, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .expect(401);

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('image', Buffer.from('fake-jpg'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it('replaces an existing image and deletes the previous asset', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Replace image',
        description: 'Replace image service',
        order: 6,
      });

      cloudinaryService.uploadImage
        .mockResolvedValueOnce({
          url: 'https://res.cloudinary.com/test/old.jpg',
          publicId: 'credex/services/old',
        })
        .mockResolvedValueOnce({
          url: 'https://res.cloudinary.com/test/new.jpg',
          publicId: 'credex/services/new',
        });

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('old'), {
          filename: 'old.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      cloudinaryService.deleteAsset.mockClear();

      const response = await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('new'), {
          filename: 'new.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(response.body.data.image.publicId).toBe('credex/services/new');
      expect(cloudinaryService.deleteAsset).toHaveBeenCalledWith(
        'credex/services/old',
      );
    });
  });

  describe('DELETE /api/v1/services/:id/image', () => {
    it('removes the image and keeps the service', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createService(adminToken, {
        title: 'Remove image',
        description: 'Remove image service',
        order: 7,
      });

      await request(app.getHttpServer())
        .post(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-jpg'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      cloudinaryService.deleteAsset.mockClear();

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/services/${created.id}/image`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(cloudinaryService.deleteAsset).toHaveBeenCalled();
      expect(response.body.data.image).toBeNull();
      expect(response.body.data.title).toBe('Remove image');
    });
  });
});
