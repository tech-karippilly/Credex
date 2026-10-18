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
import { TeamMember } from '../src/team-members/schemas/team-member.schema';
import { MINIMAL_JPEG_BUFFER, MINIMAL_PNG_BUFFER } from './image-fixtures';
import './setup-env';

const basePayload = {
  fullName: 'Jane Doe',
  designation: 'Software Engineer',
  department: 'Engineering',
  positionInCompany: 'Engineering',
  bio: 'Builds reliable software.',
  order: 1,
};

describe('Team members (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let teamMemberModel: Model<TeamMember>;
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
    teamMemberModel = app.get<Model<TeamMember>>(getModelToken(TeamMember.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await teamMemberModel.deleteMany({});
    jest.clearAllMocks();
    cloudinaryService.uploadImage.mockResolvedValue({
      url: 'https://res.cloudinary.com/test/image/upload/v1/credex/team-members/mock.jpg',
      publicId: 'credex/team-members/mock',
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

  async function createMember(token: string, payload = basePayload) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/team-members')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data as { id: string; status: string };
  }

  function uploadPhoto(token: string, id: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/team-members/${id}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', MINIMAL_JPEG_BUFFER, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });
  }

  describe('POST /api/v1/team-members', () => {
    it('creates a draft team member with valid data', async () => {
      const adminToken = await loginAsAdmin();
      const created = await createMember(adminToken);

      expect(created.status).toBe('draft');
    });

    it('rejects missing required fields', async () => {
      const adminToken = await loginAsAdmin();
      await request(app.getHttpServer())
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...basePayload, fullName: '' })
        .expect(400);
    });

    it('rejects unexpected properties', async () => {
      const adminToken = await loginAsAdmin();
      await request(app.getHttpServer())
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...basePayload, extraField: true })
        .expect(400);
    });

    it('rejects unauthenticated and unauthorized users', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/team-members')
        .send(basePayload)
        .expect(401);

      const userToken = await loginAsUser();
      await request(app.getHttpServer())
        .post('/api/v1/team-members')
        .set('Authorization', `Bearer ${userToken}`)
        .send(basePayload)
        .expect(403);
    });
  });

  describe('GET /api/v1/team-members', () => {
    it('returns only published members sorted by order', async () => {
      const adminToken = await loginAsAdmin();
      const draft = await createMember(adminToken, {
        ...basePayload,
        fullName: 'Draft Person',
        order: 1,
      });
      const published = await createMember(adminToken, {
        ...basePayload,
        fullName: 'Published First',
        order: 1,
      });
      const publishedSecond = await createMember(adminToken, {
        ...basePayload,
        fullName: 'Published Second',
        order: 2,
      });

      await uploadPhoto(adminToken, published.id).expect(201);
      await uploadPhoto(adminToken, publishedSecond.id).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${published.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${publishedSecond.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${draft.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/team-members')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].fullName).toBe('Published First');
      expect(response.body.data[1].fullName).toBe('Published Second');
      expect(response.body.data[0]).not.toHaveProperty('status');
      expect(response.body.data[0].photo).toEqual({
        url: 'https://res.cloudinary.com/test/image/upload/v1/credex/team-members/mock.jpg',
      });
      expect(response.body.data[0].photo).not.toHaveProperty('publicId');
    });
  });

  describe('GET /api/v1/team-members/:id', () => {
    it('returns 404 for draft and inactive profiles', async () => {
      const adminToken = await loginAsAdmin();
      const draft = await createMember(adminToken);

      await request(app.getHttpServer())
        .get(`/api/v1/team-members/${draft.id}`)
        .expect(404);
    });

    it('returns a published profile without admin fields', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);
      await uploadPhoto(adminToken, member.id).expect(201);
      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${member.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/team-members/${member.id}`)
        .expect(200);

      expect(response.body.data.fullName).toBe(basePayload.fullName);
      expect(response.body.data).not.toHaveProperty('status');
      expect(response.body.data.photo).not.toHaveProperty('publicId');
    });
  });

  describe('PATCH /api/v1/team-members/:id/status', () => {
    it('rejects publication without a photo', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${member.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(400);
    });

    it('supports draft, published and inactive transitions', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);
      await uploadPhoto(adminToken, member.id).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${member.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/team-members')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(1);
        });

      await request(app.getHttpServer())
        .patch(`/api/v1/team-members/${member.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/team-members')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveLength(0);
        });
    });
  });

  describe('POST /api/v1/team-members/:id/photo', () => {
    it('uploads JPG and PNG images', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);

      await uploadPhoto(adminToken, member.id).expect(201);
      expect(cloudinaryService.uploadImage).toHaveBeenCalled();

      await request(app.getHttpServer())
        .post(`/api/v1/team-members/${member.id}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', MINIMAL_PNG_BUFFER, {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(201);
    });

    it('rejects invalid image types and oversized uploads', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);

      await request(app.getHttpServer())
        .post(`/api/v1/team-members/${member.id}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('text'), {
          filename: 'file.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/team-members/${member.id}/photo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });

    it('cleans up the previous Cloudinary asset after replacement', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);

      cloudinaryService.uploadImage
        .mockResolvedValueOnce({
          url: 'https://res.cloudinary.com/test/image/upload/v1/credex/team-members/a.jpg',
          publicId: 'credex/team-members/a',
        })
        .mockResolvedValueOnce({
          url: 'https://res.cloudinary.com/test/image/upload/v1/credex/team-members/b.jpg',
          publicId: 'credex/team-members/b',
        });

      await uploadPhoto(adminToken, member.id).expect(201);
      await uploadPhoto(adminToken, member.id).expect(201);

      expect(cloudinaryService.deleteAsset).toHaveBeenCalledWith(
        'credex/team-members/a',
      );
    });
  });

  describe('DELETE /api/v1/team-members/:id', () => {
    it('deletes a member and its Cloudinary photo', async () => {
      const adminToken = await loginAsAdmin();
      const member = await createMember(adminToken);
      await uploadPhoto(adminToken, member.id).expect(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/team-members/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(cloudinaryService.deleteAsset).toHaveBeenCalled();
      await request(app.getHttpServer())
        .get(`/api/v1/team-members/admin/${member.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
