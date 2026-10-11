import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { PermissionsService } from '../src/rbac/permissions.service';
import { RolePermissionsService } from '../src/rbac/role-permissions.service';
import { RolesService } from '../src/rbac/roles.service';
import { Role, RoleDocument } from '../src/rbac/schemas/role.schema';
import { UserRolesService } from '../src/rbac/user-roles.service';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Permission enforcement (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let rolesService: RolesService;
  let rolePermissions: RolePermissionsService;
  let userRoles: UserRolesService;
  let permissionsService: PermissionsService;
  let roleModel: Model<RoleDocument>;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    rolesService = app.get(RolesService);
    rolePermissions = app.get(RolePermissionsService);
    userRoles = app.get(UserRolesService);
    permissionsService = app.get(PermissionsService);
    roleModel = app.get(getModelToken(Role.name));
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
      user: { id: string };
    };
  }

  async function createUser(email: string) {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: 'Permission User',
        email,
        password: 'SecurePassword123',
      })
      .expect(201);

    return {
      id: response.body.data.id as string,
      email,
      password: 'SecurePassword123',
    };
  }

  it('lets the legacy super administrator use admin APIs without a database role', async () => {
    const admin = await login(
      adminCredentials.email,
      adminCredentials.password,
    );

    expect(admin.user.id).toBe('admin');

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/careers/admin')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/reports/expenses')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('keeps public routes public and rejects anonymous calls to protected routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/careers').expect(200);
    await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    await request(app.getHttpServer()).get('/api/v1/site-contact').expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/applications')
      .send({})
      .expect(400);

    await request(app.getHttpServer()).get('/api/v1/expenses').expect(401);
    await request(app.getHttpServer()).get('/api/v1/careers/admin').expect(401);
    await request(app.getHttpServer()).get('/api/v1/applications').expect(401);
  });

  it('returns 403 when a signed-in user has no matching persisted permission', async () => {
    const user = await createUser('no-role@example.com');
    const session = await login(user.email, user.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/v1/expenses/000000000000000000000001')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/expenses/reports/export?type=category-wise')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/reports/payments/export')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/vouchers')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/v1/payments/000000000000000000000001/status')
      .set(auth)
      .send({ status: 'CANCELLED' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth)
      .send({
        name: 'Other',
        email: 'other-user@example.com',
        password: 'SecurePassword123',
      })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set(auth)
      .expect(200);
  });

  it('separates read from delete and export, and applies role changes immediately', async () => {
    const user = await createUser('reader@example.com');
    const role = await rolesService.create({
      name: 'Expense reader',
      key: 'expense-reader',
      description: 'Reads expenses only',
    });
    await rolePermissions.grant(role._id.toString(), 'expenses.read');
    await userRoles.assign(user.id, role._id.toString());

    const session = await login(user.email, user.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };
    const payload = JSON.parse(
      Buffer.from(session.accessToken.split('.')[1], 'base64url').toString(),
    ) as { permissions?: unknown };

    expect(payload.permissions).toBeUndefined();

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth)
      .expect(200);
    await request(app.getHttpServer())
      .delete('/api/v1/expenses/000000000000000000000001')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/expenses/reports/export?type=category-wise')
      .set(auth)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/payments')
      .set(auth)
      .expect(403);

    await rolePermissions.grant(role._id.toString(), 'expenses.export');

    await request(app.getHttpServer())
      .get('/api/v1/expenses/reports/export?type=category-wise')
      .set(auth)
      .expect(200);

    await userRoles.revoke(user.id, role._id.toString());

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set(auth)
      .expect(403);
  });

  it('requires the status permission when a voucher update includes status', async () => {
    const user = await createUser('voucher-editor@example.com');
    const role = await rolesService.create({
      name: 'Voucher editor',
      key: 'voucher-editor',
      description: 'Updates vouchers without changing status',
    });
    await rolePermissions.grant(role._id.toString(), 'vouchers.update');
    await userRoles.assign(user.id, role._id.toString());
    const session = await login(user.email, user.password);
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    const withoutStatus = await request(app.getHttpServer())
      .put('/api/v1/vouchers/000000000000000000000001')
      .set(auth)
      .send({ title: 'Rent' });
    expect(withoutStatus.status).not.toBe(403);

    await request(app.getHttpServer())
      .put('/api/v1/vouchers/000000000000000000000001')
      .set(auth)
      .send({ status: 'CANCELLED' })
      .expect(403);
  });

  it('fails closed when the assigned role or permission record is gone', async () => {
    const user = await createUser('stale-role@example.com');
    const role = await rolesService.create({
      name: 'Temporary',
      key: 'temporary-reader',
      description: 'Removed after assignment',
    });
    await rolePermissions.grant(role._id.toString(), 'expenses.read');
    await userRoles.assign(user.id, role._id.toString());
    const session = await login(user.email, user.password);

    await roleModel.deleteOne({ _id: role._id }).exec();

    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(403);

    const permissionUser = await createUser('stale-permission@example.com');
    const keptRole = await rolesService.create({
      name: 'Kept role',
      key: 'kept-reader',
      description: 'Permission row is removed',
    });
    await rolePermissions.grant(keptRole._id.toString(), 'reports.read');
    await userRoles.assign(permissionUser.id, keptRole._id.toString());
    const permissionSession = await login(
      permissionUser.email,
      permissionUser.password,
    );

    const permissionModel = app.get<Model<{ key: string }>>(
      getModelToken('Permission'),
    );
    await permissionModel.deleteOne({ key: 'reports.read' }).exec();

    await request(app.getHttpServer())
      .get('/api/v1/reports/expenses')
      .set('Authorization', `Bearer ${permissionSession.accessToken}`)
      .expect(403);

    await permissionsService.seed();
  });
});
