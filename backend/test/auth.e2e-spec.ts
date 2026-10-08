import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Authentication (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
  });

  afterAll(async () => {
    await context.teardown();
  });

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  };

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);

    return response.body.data;
  }

  let userCounter = 0;

  async function createUserViaAdmin() {
    userCounter += 1;
    const adminSession = await loginAsAdmin();
    const payload = {
      name: 'John Doe',
      email: `john${userCounter}@example.com`,
      password: 'SecurePassword123',
    };

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send(payload)
      .expect(201);

    return payload;
  }

  describe('Login', () => {
    it('logs in admin with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(adminCredentials)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user).toEqual({
        id: 'admin',
        name: 'Admin',
        email: adminCredentials.email,
      });
    });

    it('logs in database user with valid credentials', async () => {
      const user = await createUserViaAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.name).toBe(user.name);
    });

    it('rejects wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: adminCredentials.email, password: 'WrongPassword123' })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('rejects wrong email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'missing@example.com', password: 'SecurePassword123' })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('validates missing email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'SecurePassword123' })
        .expect(400);
    });

    it('validates missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: adminCredentials.email })
        .expect(400);
    });
  });

  describe('Profile', () => {
    it('returns admin profile with valid access token', async () => {
      const session = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        id: 'admin',
        name: 'Admin',
        email: adminCredentials.email,
      });
    });

    it('returns user profile with valid access token', async () => {
      const user = await createUserViaAdmin();
      const session = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${session.body.data.accessToken}`)
        .expect(200);

      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.name).toBe(user.name);
    });

    it('rejects missing token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .expect(401);
    });

    it('rejects invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('rejects expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid-signature';

      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  describe('Create User', () => {
    it('allows admin to create user', async () => {
      const session = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'SecurePassword123',
        })
        .expect(201);

      expect(response.body.data.email).toBe('jane@example.com');
      expect(response.body.data.password).toBeUndefined();
    });

    it('forbids normal user from creating users', async () => {
      const user = await createUserViaAdmin();
      const session = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.body.data.accessToken}`)
        .send({
          name: 'Blocked User',
          email: 'blocked@example.com',
          password: 'SecurePassword123',
        })
        .expect(403);
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          name: 'No Auth',
          email: 'noauth@example.com',
          password: 'SecurePassword123',
        })
        .expect(401);
    });

    it('rejects duplicate email', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'Dup User',
          email: 'dup@example.com',
          password: 'SecurePassword123',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'Dup User 2',
          email: 'dup@example.com',
          password: 'SecurePassword123',
        })
        .expect(409);

      expect(response.body.message).toBe('Email already exists');
    });

    it('validates email format', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'SecurePassword123',
        })
        .expect(400);
    });

    it('validates missing name', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          email: 'noname@example.com',
          password: 'SecurePassword123',
        })
        .expect(400);
    });

    it('validates missing password', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'No Password',
          email: 'nopass@example.com',
        })
        .expect(400);
    });

    it('rejects unexpected role field', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({
          name: 'Role User',
          email: 'role@example.com',
          password: 'SecurePassword123',
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  describe('Refresh', () => {
    it('returns new access and refresh tokens', async () => {
      const session = await loginAsAdmin();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(201);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(session.refreshToken);
    });

    it('rejects invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);
    });

    it('rejects logged-out refresh token', async () => {
      const session = await loginAsAdmin();

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ refreshToken: session.refreshToken })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('rejects old rotated refresh token', async () => {
      const session = await loginAsAdmin();
      const oldRefreshToken = session.refreshToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);
    });
  });

  describe('Logout', () => {
    it('logs out successfully and invalidates refresh token', async () => {
      const session = await loginAsAdmin();

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ refreshToken: session.refreshToken })
        .expect(201);

      expect(logoutResponse.body.message).toBe('Logout successful');

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });
  });

  describe('Forgot Password', () => {
    it('returns generic response for existing email and sends reset email', async () => {
      const user = await createUserViaAdmin();
      context.emailService.sendEmail.mockClear();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(201);

      expect(response.body.message).toBe(
        'If the email exists, a password reset link has been sent.',
      );
      expect(context.emailService.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('returns generic response for unknown email', async () => {
      context.emailService.sendEmail.mockClear();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown@example.com' })
        .expect(201);

      expect(response.body.message).toBe(
        'If the email exists, a password reset link has been sent.',
      );
      expect(context.emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Reset Password', () => {
    async function requestResetToken(email: string): Promise<string> {
      context.emailService.sendEmail.mockClear();

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email })
        .expect(201);

      const html = context.emailService.sendEmail.mock.calls[0][0]
        .html as string;
      const match = html.match(/token=([a-f0-9]+)/);
      if (!match?.[1]) {
        throw new Error('Reset token not found in email');
      }
      return match[1];
    }

    it('validates reset token', async () => {
      const user = await createUserViaAdmin();
      const token = await requestResetToken(user.email);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/auth/reset-password/validate?token=${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('rejects invalid reset token validation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/reset-password/validate?token=invalid-token')
        .expect(200);

      expect(response.body.success).toBe(false);
    });

    it('resets password and invalidates refresh sessions', async () => {
      const user = await createUserViaAdmin();
      const loginSession = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      const token = await requestResetToken(user.email);
      const newPassword = 'NewSecurePassword123';

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: newPassword })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: newPassword })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginSession.body.data.refreshToken })
        .expect(401);
    });

    it('rejects reused reset token', async () => {
      const user = await createUserViaAdmin();
      const token = await requestResetToken(user.email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'NewSecurePassword123' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token, password: 'AnotherPassword123' })
        .expect(400);

      expect(response.body.message).toBe('Invalid or expired reset token');
    });
  });
});
