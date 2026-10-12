import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Enquiries (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;

  const enquiry = {
    name: 'Ada Lovelace',
    company: 'Analytical Engines',
    email: 'Ada@Example.com',
    phone: '+919999999999',
    service: 'Other / Not sure yet',
    message: 'We need a website and a short consultation.',
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
  });

  afterAll(async () => {
    await context.teardown();
  });

  async function adminToken(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(201);

    return response.body.data.accessToken as string;
  }

  it('rejects an invalid public submission', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/enquiries')
      .send({ name: 'A', email: 'not-an-email', message: 'short' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toEqual(expect.any(String));
    expect(response.body.message.length).toBeGreaterThan(0);
  });

  it('saves a public enquiry and lets an administrator read and delete it', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/enquiries')
      .send(enquiry)
      .expect(201);

    expect(created.body.data.email).toBe('ada@example.com');
    expect(created.body.data.company).toBe(enquiry.company);
    expect(created.body.data.createdAt).toEqual(expect.any(String));
    const id = created.body.data.id as string;

    await request(app.getHttpServer()).get('/api/v1/enquiries').expect(401);
    await request(app.getHttpServer())
      .delete(`/api/v1/enquiries/${id}`)
      .expect(401);

    const token = await adminToken();
    const listed = await request(app.getHttpServer())
      .get('/api/v1/enquiries')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listed.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id,
          name: enquiry.name,
          message: enquiry.message,
        }),
      ]),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/enquiries/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/enquiries')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(
      afterDelete.body.data.find((row: { id: string }) => row.id === id),
    ).toBeUndefined();
  });
});
