import {
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { PERMISSION_CATALOGUE } from '../src/rbac/catalog/permission-catalog';
import { PermissionsService } from '../src/rbac/permissions.service';
import { RbacBootstrapService } from '../src/rbac/rbac-bootstrap.service';
import { RolesService } from '../src/rbac/roles.service';
import {
  Permission,
  PermissionDocument,
} from '../src/rbac/schemas/permission.schema';
import { Role, RoleDocument } from '../src/rbac/schemas/role.schema';
import {
  UserRole,
  UserRoleDocument,
} from '../src/rbac/schemas/user-role.schema';
import { UserRolesService } from '../src/rbac/user-roles.service';
import { User, UserDocument } from '../src/users/schemas/user.schema';
import { UsersService } from '../src/users/users.service';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('RBAC foundation (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let usersService: UsersService;
  let rolesService: RolesService;
  let userRolesService: UserRolesService;
  let permissionsService: PermissionsService;
  let bootstrap: RbacBootstrapService;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let permissionModel: Model<PermissionDocument>;
  let userRoleModel: Model<UserRoleDocument>;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    usersService = app.get(UsersService);
    rolesService = app.get(RolesService);
    userRolesService = app.get(UserRolesService);
    permissionsService = app.get(PermissionsService);
    bootstrap = app.get(RbacBootstrapService);
    userModel = app.get(getModelToken(User.name));
    roleModel = app.get(getModelToken(Role.name));
    permissionModel = app.get(getModelToken(Permission.name));
    userRoleModel = app.get(getModelToken(UserRole.name));
  });

  afterAll(async () => {
    await context.teardown();
  });

  function tokenPayload(token: string): {
    sub: string;
    email: string;
    authVersion?: number;
  } {
    const segment = token.split('.')[1];
    return JSON.parse(Buffer.from(segment, 'base64url').toString()) as {
      sub: string;
      email: string;
      authVersion?: number;
    };
  }

  async function loginAsAdmin() {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201);

    return response.body.data as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; name: string; email: string };
    };
  }

  it('keeps environment administrator login and refresh on the legacy subject', async () => {
    const session = await loginAsAdmin();

    expect(session.user).toEqual({
      id: 'admin',
      name: 'Admin',
      email: adminCredentials.email,
    });
    expect(tokenPayload(session.accessToken)).toMatchObject({
      sub: 'admin',
      email: adminCredentials.email,
    });
    expect(tokenPayload(session.accessToken).authVersion).toBeUndefined();

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(201);

    expect(tokenPayload(refreshed.body.data.accessToken).sub).toBe('admin');
    expect(
      tokenPayload(refreshed.body.data.accessToken).authVersion,
    ).toBeUndefined();

    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${refreshed.body.data.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('bootstraps one protected super administrator without replacing the password later', async () => {
    const before = await usersService.findByEmailWithPassword(
      adminCredentials.email,
    );
    expect(before).not.toBeNull();
    expect(before?.isSuperAdmin).toBe(true);
    expect(before?.isActive).toBe(true);
    expect(before?.authVersion).toBe(0);
    expect(before?.password).not.toBe(adminCredentials.password);
    expect(before?.password.startsWith('$2')).toBe(true);

    const originalId = before?._id.toString();
    const originalHash = before?.password;

    await userModel
      .updateOne(
        { _id: before?._id },
        { $set: { isSuperAdmin: false, isActive: false, authVersion: 4 } },
      )
      .exec();

    await bootstrap.ensureSuperAdmin();

    const after = await usersService.findByEmailWithPassword(
      adminCredentials.email,
    );
    expect(after?._id.toString()).toBe(originalId);
    expect(after?.password).toBe(originalHash);
    expect(after?.isSuperAdmin).toBe(true);
    expect(after?.isActive).toBe(true);
    expect(after?.authVersion).toBe(4);
    expect(
      await userModel.countDocuments({ email: adminCredentials.email }),
    ).toBe(1);

    await bootstrap.ensureSuperAdmin();
    const rerun = await usersService.findByEmail(adminCredentials.email);
    expect(rerun?._id.toString()).toBe(originalId);
    expect(rerun?.authVersion).toBe(4);
  });

  it('refuses ordinary demotion, deactivation, and deletion of the super administrator', async () => {
    const admin = await usersService.findByEmail(adminCredentials.email);
    const adminId = admin?._id.toString() as string;

    await expect(
      usersService.setActiveStatus(adminId, false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(usersService.deleteById(adminId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      usersService.incrementAuthVersion(adminId),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const stillThere = await usersService.findByEmail(adminCredentials.email);
    expect(stillThere?.isSuperAdmin).toBe(true);
    expect(stillThere?.isActive).toBe(true);
  });

  it('seeds permissions once and preserves later description edits', async () => {
    expect(await permissionsService.count()).toBe(PERMISSION_CATALOGUE.length);

    await permissionModel
      .updateOne(
        { key: 'expenses.read' },
        { $set: { description: 'Custom expense read label' } },
      )
      .exec();

    await permissionsService.seed();
    await bootstrap.ensureSuperAdmin();

    const permission = await permissionModel
      .findOne({ key: 'expenses.read' })
      .exec();
    expect(permission?.description).toBe('Custom expense read label');
    expect(permission?.systemManaged).toBe(true);
    expect(await permissionsService.count()).toBe(PERMISSION_CATALOGUE.length);
  });

  it('validates required role, permission, and assignment fields', async () => {
    await expect(
      permissionModel.create({
        module: 'expenses',
        action: 'read',
        description: 'Missing key',
      }),
    ).rejects.toThrow(/key/);

    await expect(
      roleModel.create({
        key: 'missing-name',
        description: 'Missing name',
      }),
    ).rejects.toThrow(/name/);

    await expect(userRoleModel.create({})).rejects.toThrow(/userId|roleId/);
  });

  it('rejects duplicate role assignments and missing references', async () => {
    const adminSession = await loginAsAdmin();
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'Clerk User',
        email: 'clerk@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);

    const role = await rolesService.create({
      name: 'Clerk',
      key: 'clerk',
      description: 'Clerk access',
    });

    await userRolesService.assign(created.body.data.id, role._id.toString());
    await expect(
      userRolesService.assign(created.body.data.id, role._id.toString()),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      userRolesService.assign(
        created.body.data.id,
        new Types.ObjectId().toString(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      userRolesService.assign(
        new Types.ObjectId().toString(),
        role._id.toString(),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      rolesService.create({
        name: 'Clerk copy',
        key: 'clerk',
        description: 'Duplicate key',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not let ordinary role operations change the super administrator', async () => {
    const admin = await usersService.findByEmail(adminCredentials.email);
    const role = await rolesService.create({
      name: 'Auditor',
      key: 'auditor',
      description: 'Read-only audit access',
    });

    await expect(
      userRolesService.assign(
        admin?._id.toString() as string,
        role._id.toString(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      userRolesService.revoke(
        admin?._id.toString() as string,
        role._id.toString(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('gives existing users safe defaults for the new account fields', async () => {
    await userModel.collection.insertOne({
      name: 'Legacy User',
      email: 'legacy@example.com',
      password: 'stored-hash',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const raw = await userModel.collection.findOne({
      email: 'legacy@example.com',
    });
    expect(raw?.isActive).toBeUndefined();
    expect(raw?.isSuperAdmin).toBeUndefined();
    expect(raw?.authVersion).toBeUndefined();

    await usersService.backfillDefaults();

    const backfilled = await userModel.collection.findOne({
      email: 'legacy@example.com',
    });
    expect(backfilled?.isActive).toBe(true);
    expect(backfilled?.isSuperAdmin).toBe(false);
    expect(backfilled?.authVersion).toBe(0);

    const adminSession = await loginAsAdmin();
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'New User',
        email: 'new-user@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);

    const createdUser = await usersService.findById(created.body.data.id);
    expect(createdUser?.isActive).toBe(true);
    expect(createdUser?.isSuperAdmin).toBe(false);
    expect(createdUser?.authVersion).toBe(0);
    expect(created.body.data.isSuperAdmin).toBe(false);
  });

  it('rejects inactive database users on login, profile, and refresh', async () => {
    const adminSession = await loginAsAdmin();
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'Inactive User',
        email: 'inactive@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@example.com', password: 'SecurePassword123' })
      .expect(201);

    await usersService.setActiveStatus(created.body.data.id, false);

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@example.com', password: 'SecurePassword123' })
      .expect(401);
    expect(rejected.body.message).toBe('Invalid email or password');

    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken })
      .expect(401);
  });

  it('rejects database tokens whose auth version is stale', async () => {
    const adminSession = await loginAsAdmin();
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'Versioned User',
        email: 'versioned@example.com',
        password: 'SecurePassword123',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'versioned@example.com', password: 'SecurePassword123' })
      .expect(201);

    expect(tokenPayload(login.body.data.accessToken).authVersion).toBe(0);

    const user = await usersService.findByEmail('versioned@example.com');
    await usersService.incrementAuthVersion(user?._id.toString() as string);

    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.data.refreshToken })
      .expect(401);

    const nextLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'versioned@example.com', password: 'SecurePassword123' })
      .expect(201);

    expect(tokenPayload(nextLogin.body.data.accessToken).authVersion).toBe(1);

    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${nextLogin.body.data.accessToken}`)
      .expect(200);
  });

  it('reserves the administrator email and ignores a super-admin flag on create', async () => {
    const adminSession = await loginAsAdmin();

    const reserved = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'Impersonator',
        email: adminCredentials.email.toUpperCase(),
        password: 'SecurePassword123',
      })
      .expect(409);
    expect(reserved.body.message).toBe('Email already exists');

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({
        name: 'Flag User',
        email: 'flag-user@example.com',
        password: 'SecurePassword123',
        isSuperAdmin: true,
      })
      .expect(400);

    context.emailService.sendEmail.mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: adminCredentials.email })
      .expect(201);
    expect(context.emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('keeps current public and admin-only routes on their previous guards', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    await request(app.getHttpServer()).get('/api/v1/careers').expect(200);
    await request(app.getHttpServer()).get('/api/v1/expenses').expect(401);

    const adminSession = await loginAsAdmin();
    await request(app.getHttpServer())
      .get('/api/v1/expenses')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .send({ name: 'Nope', key: 'nope', description: 'Nope' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminSession.accessToken}`)
      .expect(200);
  });
});
