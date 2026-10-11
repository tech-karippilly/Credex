import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { RolesService } from '../src/rbac/roles.service';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('RBAC management (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let rolesService: RolesService;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    rolesService = app.get(RolesService);
  });

  afterAll(async () => {
    await context.teardown();
  });

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }

  function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  it('lets the super administrator manage users and roles and keeps that account protected', async () => {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );
    expect(admin.user.id).toBe('admin');

    const access = await request(app.getHttpServer())
      .get('/api/v1/auth/access')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(access.body.data.superAdmin).toBe(true);
    expect(access.body.data.permissions).toEqual(
      expect.arrayContaining(['users.read', 'roles.permissions.update']),
    );

    const users = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(auth(admin.accessToken))
      .expect(200);
    const superAdmin = users.body.data.items.find(
      (user: { isSuperAdmin: boolean }) => user.isSuperAdmin,
    );
    expect(superAdmin.email).toBe(adminCredentials.email);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${superAdmin.id}/status`)
      .set(auth(admin.accessToken))
      .send({ isActive: false })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/v1/users/${superAdmin.id}`)
      .set(auth(admin.accessToken))
      .send({ name: 'Renamed' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/users/${superAdmin.id}`)
      .set(auth(admin.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(admin.accessToken))
      .send({
        name: 'Escalated',
        email: 'escalated@example.com',
        password: 'SecurePassword123',
        isSuperAdmin: true,
      })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(admin.accessToken))
      .send({
        name: 'Managed User',
        email: 'managed@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);
    expect(created.body.data.password).toBeUndefined();
    expect(created.body.data.isSuperAdmin).toBe(false);

    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(admin.accessToken))
      .send({ name: 'Expense Reader', description: 'Reads expenses' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/roles/${role.body.data.id}/permissions`)
      .set(auth(admin.accessToken))
      .send({ permissionKey: 'expenses.read' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/roles/${role.body.data.id}/permissions`)
      .set(auth(admin.accessToken))
      .send({ permissionKey: 'expenses.read' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/v1/roles/${role.body.data.id}/permissions`)
      .set(auth(admin.accessToken))
      .send({ permissionKey: 'not.a.permission' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${created.body.data.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: role.body.data.id })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${created.body.data.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: role.body.data.id })
      .expect(409);

    const reader = await login('managed@example.com', 'SecurePassword123');
    const readerAccess = await request(app.getHttpServer())
      .get('/api/v1/auth/access')
      .set(auth(reader.accessToken))
      .expect(200);
    expect(readerAccess.body.data.superAdmin).toBe(false);
    expect(readerAccess.body.data.permissions).toEqual(['expenses.read']);

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth(reader.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/careers/admin')
      .set(auth(reader.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set(auth(reader.accessToken))
      .expect(403);
    await request(app.getHttpServer()).get('/api/v1/careers').expect(200);

    await request(app.getHttpServer())
      .delete(
        `/api/v1/roles/${role.body.data.id}/permissions/expenses.read`,
      )
      .set(auth(admin.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth(reader.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${created.body.data.id}/status`)
      .set(auth(admin.accessToken))
      .send({ isActive: false })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/auth/access')
      .set(auth(reader.accessToken))
      .expect(401);
  });

  it('stops a limited administrator from delegating permissions they do not hold', async () => {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(admin.accessToken))
      .send({
        name: 'Limited Admin',
        description: 'Manages a subset of access',
      })
      .expect(201);
    const roleId = role.body.data.id as string;

    for (const permissionKey of [
      'users.read',
      'users.create',
      'users.update',
      'roles.read',
      'roles.create',
      'roles.update',
      'roles.delete',
      'roles.permissions.update',
      'expenses.read',
    ]) {
      await request(app.getHttpServer())
        .post(`/api/v1/roles/${roleId}/permissions`)
        .set(auth(admin.accessToken))
        .send({ permissionKey })
        .expect(201);
    }

    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(admin.accessToken))
      .send({
        name: 'Limited Admin',
        email: 'limited-admin@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);
    const colleague = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(admin.accessToken))
      .send({
        name: 'Colleague',
        email: 'colleague@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${created.body.data.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId })
      .expect(201);

    const privileged = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(admin.accessToken))
      .send({ name: 'Payments Admin', description: 'Deletes payments' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/roles/${privileged.body.data.id}/permissions`)
      .set(auth(admin.accessToken))
      .send({ permissionKey: 'payments.delete' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/roles/${privileged.body.data.id}/permissions`)
      .set(auth(admin.accessToken))
      .send({ permissionKey: 'expenses.delete' })
      .expect(201);

    const session = await login(
      'limited-admin@example.com',
      'SecurePassword123',
    );
    const header = auth(session.accessToken);

    await request(app.getHttpServer())
      .get('/api/v1/users?search=colleague')
      .set(header)
      .expect(200);
    await request(app.getHttpServer())
      .put(`/api/v1/users/${colleague.body.data.id}`)
      .set(header)
      .send({ name: 'Updated Colleague' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/roles/${roleId}/permissions`)
      .set(header)
      .send({ permissionKey: 'expenses.delete' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${session.user.id}/roles`)
      .set(header)
      .send({ roleId: privileged.body.data.id })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${colleague.body.data.id}/roles`)
      .set(header)
      .send({ roleId: privileged.body.data.id })
      .expect(403);

    const ownRole = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(header)
      .send({ name: 'Own Expenses', description: 'Same read access' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/roles/${ownRole.body.data.id}/permissions`)
      .set(header)
      .send({ permissionKey: 'expenses.read' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${session.user.id}/roles`)
      .set(header)
      .send({ roleId: ownRole.body.data.id })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/users/${colleague.body.data.id}/roles`)
      .set(header)
      .send({ roleId: ownRole.body.data.id })
      .expect(201);

    const systemRole = await rolesService.create({
      name: 'System Role',
      key: 'system_role',
      description: 'Protected',
      systemManaged: true,
    });
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${systemRole._id.toString()}`)
      .set(auth(admin.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/roles/${ownRole.body.data.id}`)
      .set(header)
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(header)
      .send({ name: 'Own Expenses', description: 'Duplicate' })
      .expect(409);
  });
});
