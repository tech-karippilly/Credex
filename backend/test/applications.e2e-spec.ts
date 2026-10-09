import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { App } from 'supertest/types';
import { AiService } from '../src/ai/ai.service';
import { AppModule } from '../src/app.module';
import { Application } from '../src/applications/schemas/application.schema';
import { ResumeContentService } from '../src/applications/resume-content.service';
import { Career } from '../src/careers/schemas/career.schema';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { EmailService } from '../src/email/email.service';
import './setup-env';

const careerPayload = {
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

const applicationPayload = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919999999999',
  experience: '4',
  location: 'Thrissur',
  coverLetter: 'I have led regional sales.',
};

describe('Applications (e2e)', () => {
  let app: INestApplication<App>;
  let mongod: MongoMemoryServer;
  let careerModel: Model<Career>;
  let applicationModel: Model<Application>;
  let prompts: string[];

  const cloudinaryService = {
    uploadImage: jest.fn(),
    uploadDocument: jest.fn().mockResolvedValue({
      url: 'https://res.cloudinary.com/test/raw/upload/v1/credex/resumes/mock.pdf',
      publicId: 'credex/resumes/mock',
    }),
    deleteAsset: jest.fn().mockResolvedValue(undefined),
  };

  const aiService = {
    generateText: jest.fn(),
  };

  const resumeContentService = {
    readFromUrl: jest
      .fn()
      .mockResolvedValue(
        'Sales executive with four years of lead generation and client management.',
      ),
  };

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
      .useValue(cloudinaryService)
      .overrideProvider(AiService)
      .useValue(aiService)
      .overrideProvider(ResumeContentService)
      .useValue(resumeContentService)
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
    applicationModel = app.get<Model<Application>>(
      getModelToken(Application.name),
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
    prompts = [];
    aiService.generateText.mockImplementation(async (prompt: string) => {
      prompts.push(prompt);
      const score = prompts.length === 1 ? 61 : 92;
      return JSON.stringify({
        score,
        summary: `Suitability ${score} for ${careerPayload.title}`,
        strengths: ['Lead generation'],
        gaps: ['Limited NBFC exposure'],
        recommendation: score >= 80 ? 'SHORTLIST' : 'REVIEW',
      });
    });
    cloudinaryService.uploadDocument.mockClear();
    cloudinaryService.deleteAsset.mockClear();
    resumeContentService.readFromUrl.mockClear();
    await careerModel.deleteMany({});
    await applicationModel.deleteMany({});
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
    payload: Record<string, unknown> = careerPayload,
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/careers')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body.data;
  }

  function submitApplication(
    careerId: string,
    payload: Record<string, unknown> = applicationPayload,
  ) {
    return request(app.getHttpServer())
      .post('/api/v1/applications')
      .send({ ...payload, careerId });
  }

  describe('POST /api/v1/applications', () => {
    it('creates an application for a visible career', async () => {
      const adminToken = await loginAsAdmin();
      const career = await createCareer(adminToken);

      const response = await submitApplication(career.id).expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Application submitted successfully',
        data: {
          careerId: career.id,
          career: {
            id: career.id,
            title: careerPayload.title,
            isVisible: true,
          },
          candidate: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+919999999999',
            experience: '4',
            location: 'Thrissur',
          },
          coverLetter: 'I have led regional sales.',
          resume: null,
          status: 'NEW',
          aiAnalysis: null,
        },
      });
    });

    it('rejects hidden careers, unknown careers, and admin-only fields', async () => {
      const adminToken = await loginAsAdmin();
      const hidden = await createCareer(adminToken, {
        ...careerPayload,
        title: 'Hidden role',
        order: 2,
        isVisible: false,
      });

      await submitApplication(hidden.id).expect(404);
      await submitApplication('64b7f3c2a1b2c3d4e5f60718').expect(404);
      await submitApplication('not-an-id').expect(400);

      const visible = await createCareer(adminToken);
      await submitApplication(visible.id, {
        ...applicationPayload,
        status: 'HIRED',
      }).expect(400);
      await submitApplication(visible.id, {
        ...applicationPayload,
        aiAnalysis: { score: 100 },
      }).expect(400);
      await submitApplication(visible.id, {
        ...applicationPayload,
        aiScore: 100,
      }).expect(400);
    });
  });

  describe('POST /api/v1/applications/:id/resume', () => {
    it('stores a pdf, doc, or docx resume without saving the file in MongoDB', async () => {
      const adminToken = await loginAsAdmin();
      const career = await createCareer(adminToken);
      const created = await submitApplication(career.id).expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/applications/${created.body.data.id}/resume`)
        .attach('resume', Buffer.from('%PDF-1.4'), {
          filename: 'john-doe.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(cloudinaryService.uploadDocument).toHaveBeenCalled();
      expect(response.body.data.resume).toEqual({
        url: 'https://res.cloudinary.com/test/raw/upload/v1/credex/resumes/mock.pdf',
        publicId: 'credex/resumes/mock',
        fileName: 'john-doe.pdf',
        mimeType: 'application/pdf',
      });

      const stored = await applicationModel.findById(created.body.data.id);
      expect(stored?.resume?.url).toBe(response.body.data.resume.url);
      expect(JSON.stringify(stored)).not.toContain('%PDF-1.4');
    });

    it('rejects executables and oversized files', async () => {
      const adminToken = await loginAsAdmin();
      const career = await createCareer(adminToken);
      const created = await submitApplication(career.id).expect(201);
      const url = `/api/v1/applications/${created.body.data.id}/resume`;

      await request(app.getHttpServer())
        .post(url)
        .attach('resume', Buffer.from('MZ'), {
          filename: 'resume.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(url)
        .attach('resume', Buffer.from('hello'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(url)
        .attach('resume', Buffer.alloc(10 * 1024 * 1024 + 1), {
          filename: 'large.pdf',
          contentType: 'application/pdf',
        })
        .expect(413);
    });
  });

  describe('admin application review', () => {
    it('lists, filters, ranks, updates status, and analyzes against the career', async () => {
      const adminToken = await loginAsAdmin();
      const userToken = await loginAsUser();
      const career = await createCareer(adminToken);
      const other = await createCareer(adminToken, {
        ...careerPayload,
        title: 'Designer',
        order: 3,
      });

      const weaker = await submitApplication(career.id, {
        ...applicationPayload,
        email: 'weaker@example.com',
      }).expect(201);
      const stronger = await submitApplication(career.id, {
        ...applicationPayload,
        name: 'Asha Menon',
        email: 'asha@example.com',
      }).expect(201);
      const otherApplication = await submitApplication(other.id, {
        ...applicationPayload,
        email: 'other@example.com',
      }).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${weaker.body.data.id}/resume`)
        .attach('resume', Buffer.from('%PDF-1.4 weaker'), {
          filename: 'weaker.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      cloudinaryService.uploadDocument.mockResolvedValueOnce({
        url: 'https://res.cloudinary.com/test/raw/upload/v1/credex/resumes/stronger.pdf',
        publicId: 'credex/resumes/stronger',
      });
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${stronger.body.data.id}/resume`)
        .attach('resume', Buffer.from('%PDF-1.4 stronger'), {
          filename: 'stronger.docx',
          contentType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/v1/applications')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${weaker.body.data.id}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${stronger.body.data.id}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(prompts[0]).toContain(careerPayload.title);
      expect(prompts[0]).toContain('Generate leads');
      expect(prompts[0]).toContain('Good communication skills');
      expect(prompts[0]).toContain('NBFC experience');
      expect(prompts[0]).toContain('Irinjalakuda, Kerala');
      expect(prompts[0]).toContain(
        'Sales executive with four years of lead generation',
      );

      const ranked = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .query({ careerId: career.id })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(ranked.body.data.map((item: { id: string }) => item.id)).toEqual([
        stronger.body.data.id,
        weaker.body.data.id,
      ]);
      expect(ranked.body.data[0].aiAnalysis.score).toBe(92);
      expect(ranked.body.data[1].aiAnalysis.score).toBe(61);

      const all = await request(app.getHttpServer())
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(all.body.data).toHaveLength(3);
      expect(
        all.body.data.some(
          (item: { id: string }) => item.id === otherApplication.body.data.id,
        ),
      ).toBe(true);

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/applications/${stronger.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(detail.body.data.resume.fileName).toBe('stronger.docx');
      expect(detail.body.data.candidate.name).toBe('Asha Menon');

      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/applications/${stronger.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SHORTLISTED' })
        .expect(200);
      expect(updated.body.data.status).toBe('SHORTLISTED');

      await request(app.getHttpServer())
        .patch(`/api/v1/applications/${stronger.body.data.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'MAYBE' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/applications/${otherApplication.body.data.id}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('analyzes an application after its career is hidden and fails if the career was deleted', async () => {
      const adminToken = await loginAsAdmin();
      const career = await createCareer(adminToken);
      const created = await submitApplication(career.id).expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${created.body.data.id}/resume`)
        .attach('resume', Buffer.from('%PDF-1.4'), {
          filename: 'john.doc',
          contentType: 'application/msword',
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/careers/${career.id}/visibility`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isVisible: false })
        .expect(200);

      const analyzed = await request(app.getHttpServer())
        .post(`/api/v1/applications/${created.body.data.id}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
      expect(analyzed.body.data.aiAnalysis.recommendation).toBe('REVIEW');

      await careerModel.deleteMany({});
      await request(app.getHttpServer())
        .post(`/api/v1/applications/${created.body.data.id}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
