import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('App (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
  });

  afterAll(async () => {
    await context.teardown();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Backend is running');
      });
  });
});
