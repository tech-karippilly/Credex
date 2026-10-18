import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import ExcelJS from 'exceljs';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { Lead } from '../src/leads/schemas/lead.schema';
import { LeadActivity } from '../src/leads/schemas/lead-activity.schema';
import { LEAD_IMPORT_HEADERS } from '../src/leads/utils/lead-excel-map.util';
import './setup-env';
import { createE2eApp, E2eContext } from './e2e-utils';

describe('Leads (e2e)', () => {
  let context: E2eContext;
  let app: INestApplication<App>;
  let leadModel: Model<Lead>;
  let activityModel: Model<LeadActivity>;

  const adminCredentials = {
    email: process.env.ADMIN_EMAIL as string,
    password: process.env.ADMIN_PASSWORD as string,
  };

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    leadModel = app.get(getModelToken(Lead.name));
    activityModel = app.get(getModelToken(LeadActivity.name));
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
      user: { id: string; email: string };
    };
  }

  function auth(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  async function adminToken() {
    return (await login(adminCredentials.email, adminCredentials.password))
      .accessToken;
  }

  async function createUserWithPermissions(
    email: string,
    keys: string[],
  ): Promise<{ token: string; id: string }> {
    const token = await adminToken();
    const created = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set(auth(token))
      .send({ name: email.split('@')[0], email, password: 'SecurePassword123' })
      .expect(201);
    const role = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(token))
      .send({ name: `${email}-role`, description: 'Leads test role' })
      .expect(201);
    for (const key of keys) {
      await request(app.getHttpServer())
        .post(`/api/v1/roles/${role.body.data.id}/permissions`)
        .set(auth(token))
        .send({ permissionKey: key })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post(`/api/v1/users/${created.body.data.id}/roles`)
      .set(auth(token))
      .send({ roleId: role.body.data.id })
      .expect(201);
    const session = await login(email, 'SecurePassword123');
    return { token: session.accessToken, id: created.body.data.id as string };
  }

  function leadPayload(overrides: Record<string, unknown> = {}) {
    return {
      companyName: 'Acme Traders',
      contactName: 'Priya Nair',
      phone: '+919876543210',
      email: 'priya@example.com',
      source: 'REFERRAL',
      ...overrides,
    };
  }

  async function xlsxBuffer(rows: string[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Leads');
    sheet.addRow([...LEAD_IMPORT_HEADERS]);
    for (const row of rows) {
      sheet.addRow(row);
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  function headerRow(values: Record<string, string>): string[] {
    return [...LEAD_IMPORT_HEADERS].map((header) => {
      const map: Record<string, string> = {
        'Company Name': values.companyName ?? '',
        'Contact Name': values.contactName ?? '',
        Phone: values.phone ?? '',
        'Alternate Phone': values.alternatePhone ?? '',
        Email: values.email ?? '',
        Website: '',
        Location: values.location ?? '',
        Source: values.source ?? '',
        Stage: values.stage ?? '',
        Priority: values.priority ?? '',
        'Assigned User Email': values.assignedUserEmail ?? '',
        'Interest Type': '',
        'Interested Modules': values.modules ?? '',
        'Requested Features': '',
        'Change Requests': '',
        'Business Requirements': '',
        'Estimated Budget': '',
        'Expected Timeline': '',
        'Decision Maker': '',
        'Next Follow-up Date': values.nextFollowUpAt ?? '',
        'Next Action': '',
        Notes: values.notes ?? '',
      };
      return map[header] ?? '';
    });
  }

  it('seeds leads permissions in the catalogue', async () => {
    const token = await adminToken();
    const catalogue = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set(auth(token))
      .expect(200);
    const keys = catalogue.body.data.map((item: { key: string }) => item.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'leads.read',
        'leads.create',
        'leads.update',
        'leads.delete',
        'leads.assign',
        'leads.import',
        'leads.export',
        'team_members.read',
      ]),
    );
  });

  it('rejects unauthenticated and unauthorized lead access', async () => {
    await request(app.getHttpServer()).get('/api/v1/leads').expect(401);
    const reader = await createUserWithPermissions('leads-none@example.com', [
      'enquiries.read',
    ]);
    await request(app.getHttpServer())
      .get('/api/v1/leads')
      .set(auth(reader.token))
      .expect(403);
  });

  it('creates, lists, filters, and paginates leads', async () => {
    const token = await adminToken();
    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(leadPayload())
      .expect(201);
    expect(created.body.data.companyName).toBe('Acme Traders');
    expect(created.body.data.stage).toBe('NEW');

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(
        leadPayload({
          companyName: 'Beta Mills',
          contactName: 'Arun',
          phone: '+919811111111',
          email: 'arun@example.com',
          source: 'EVENT',
          stage: 'QUALIFIED',
          nextFollowUpAt: '2026-10-15',
        }),
      )
      .expect(201);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/leads?search=Acme&page=1&limit=10')
      .set(auth(token))
      .expect(200);
    expect(listed.body.data.pagination.total).toBeGreaterThanOrEqual(1);
    expect(listed.body.data.items[0].companyName).toBe('Acme Traders');

    const qualified = await request(app.getHttpServer())
      .get('/api/v1/leads?stage=QUALIFIED')
      .set(auth(token))
      .expect(200);
    expect(
      qualified.body.data.items.every(
        (item: { stage: string }) => item.stage === 'QUALIFIED',
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .get('/api/v1/leads?stage=NOT_A_STAGE')
      .set(auth(token))
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/leads?search=(unclosed')
      .set(auth(token))
      .expect(200);
  });

  it('rejects invalid payloads, inactive assignees, and duplicate contacts', async () => {
    const token = await adminToken();
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send({ contactName: 'No Company', phone: '+919800000000', source: 'OTHER' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(leadPayload({ source: 'WALK_IN', phone: '+919800000001', email: 'walk@example.com' }))
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(
        leadPayload({
          phone: '+919800000002',
          email: 'inactive-assignee@example.com',
          assignedUserId: '64b0c0c0c0c0c0c0c0c0c0c0',
        }),
      )
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(
        leadPayload({
          phone: '+919876543210',
          email: 'duplicate-priya@example.com',
        }),
      )
      .expect(409);
  });

  it('updates stage, records activities, and preserves history after delete', async () => {
    const token = await adminToken();
    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(
        leadPayload({
          phone: '+919800000010',
          email: 'history@example.com',
          companyName: 'History Co',
        }),
      )
      .expect(201);
    const id = created.body.data.id as string;

    await request(app.getHttpServer())
      .patch(`/api/v1/leads/${id}/stage`)
      .set(auth(token))
      .send({ stage: 'CONTACTED' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${id}/activities`)
      .set(auth(token))
      .send({
        type: 'CALL',
        payload: {
          outcome: 'CONNECTED',
          notes: 'Discussed HRMS',
          nextFollowUpAt: '2026-10-18',
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${id}/activities`)
      .set(auth(token))
      .send({
        type: 'FOLLOW_UP',
        payload: { followUpStatus: 'COMPLETED' },
      })
      .expect(201);

    const afterFollowUp = await request(app.getHttpServer())
      .get(`/api/v1/leads/${id}`)
      .set(auth(token))
      .expect(200);
    expect(afterFollowUp.body.data.nextFollowUpAt).toBeNull();

    await request(app.getHttpServer())
      .post(`/api/v1/leads/${id}/activities`)
      .set(auth(token))
      .send({
        type: 'DEMO_SCHEDULED',
        payload: { demoAt: '2026-10-22', demoMode: 'ONLINE' },
      })
      .expect(201);

    const activities = await request(app.getHttpServer())
      .get(`/api/v1/leads/${id}/activities`)
      .set(auth(token))
      .expect(200);
    const types = activities.body.data.items.map(
      (item: { type: string }) => item.type,
    );
    expect(types).toEqual(
      expect.arrayContaining([
        'CREATED',
        'STATUS_CHANGED',
        'CALL',
        'FOLLOW_UP',
        'DEMO_SCHEDULED',
      ]),
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/leads/${id}`)
      .set(auth(token))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/leads/${id}`)
      .set(auth(token))
      .expect(404);
    expect(
      await activityModel.countDocuments({ leadId: new Types.ObjectId(id) }),
    ).toBeGreaterThan(0);
  });

  it('lets a reader see another user lead and enforces write/import/export permissions', async () => {
    const admin = await adminToken();
    const created = await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(admin))
      .send(
        leadPayload({
          phone: '+919800000020',
          email: 'shared@example.com',
          companyName: 'Shared Co',
        }),
      )
      .expect(201);

    const reader = await createUserWithPermissions('leads-reader@example.com', [
      'leads.read',
    ]);
    const listed = await request(app.getHttpServer())
      .get('/api/v1/leads?search=Shared')
      .set(auth(reader.token))
      .expect(200);
    expect(listed.body.data.items.some((item: { id: string }) => item.id === created.body.data.id)).toBe(
      true,
    );

    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(reader.token))
      .send(leadPayload({ phone: '+919800000021', email: 'nope@example.com' }))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/leads/export')
      .set(auth(reader.token))
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/leads/import/preview')
      .set(auth(reader.token))
      .expect(403);

    const writer = await createUserWithPermissions('leads-writer@example.com', [
      'leads.read',
      'leads.create',
      'leads.update',
    ]);
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(writer.token))
      .send(
        leadPayload({
          phone: '+919800000022',
          email: 'assign-denied@example.com',
          assignedUserId: writer.id,
        }),
      )
      .expect(403);
  });

  it('returns summary counts from aggregations', async () => {
    const token = await adminToken();
    const summary = await request(app.getHttpServer())
      .get('/api/v1/leads/summary')
      .set(auth(token))
      .expect(200);
    expect(summary.body.data.total).toBeGreaterThanOrEqual(1);
    expect(summary.body.data.byStage).toEqual(
      expect.arrayContaining([expect.objectContaining({ stage: 'NEW' })]),
    );
    expect(typeof summary.body.data.overdueFollowUps).toBe('number');
  });

  it('lists active assignees without requiring users.read', async () => {
    const reader = await createUserWithPermissions('leads-assign-list@example.com', [
      'leads.read',
    ]);
    const assignees = await request(app.getHttpServer())
      .get('/api/v1/leads/assignees')
      .set(auth(reader.token))
      .expect(200);
    expect(Array.isArray(assignees.body.data)).toBe(true);
    expect(assignees.body.data[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String), email: expect.any(String) }),
    );
    expect(assignees.body.data[0].password).toBeUndefined();
  });

  it('previews spreadsheet imports without writing, commits valid rows, and rejects xls', async () => {
    const token = await adminToken();
    const before = await leadModel.countDocuments();
    const workbook = await xlsxBuffer([
      headerRow({
        companyName: 'Import Co',
        contactName: 'Neha',
        phone: '+919800000030',
        email: 'neha@import.test',
        source: 'EVENT',
      }),
      headerRow({
        companyName: '',
        contactName: 'Missing Company',
        phone: '+919800000031',
      }),
    ]);

    const preview = await request(app.getHttpServer())
      .post('/api/v1/leads/import/preview')
      .set(auth(token))
      .attach('file', workbook, 'leads.xlsx')
      .expect(201);
    expect(preview.body.data.totalRows).toBe(2);
    expect(preview.body.data.validRows).toBe(1);
    expect(preview.body.data.invalidRows).toBe(1);
    expect(await leadModel.countDocuments()).toBe(before);

    const committed = await request(app.getHttpServer())
      .post('/api/v1/leads/import')
      .set(auth(token))
      .attach('file', workbook, 'leads.xlsx')
      .expect(201);
    expect(committed.body.data.inserted).toBe(1);

    const again = await request(app.getHttpServer())
      .post('/api/v1/leads/import')
      .set(auth(token))
      .attach('file', workbook, 'leads.xlsx')
      .expect(201);
    expect(again.body.data.inserted).toBe(0);
    expect(again.body.data.duplicateRows).toBeGreaterThanOrEqual(1);

    const csv = Buffer.from(
      `${LEAD_IMPORT_HEADERS.join(',')}\nCsv Co,Ravi,+919800000040, ,ravi@csv.test,,,,,,,,,,,,,,,,,\n`,
    );
    await request(app.getHttpServer())
      .post('/api/v1/leads/import/preview')
      .set(auth(token))
      .attach('file', csv, 'leads.csv')
      .expect(201);

    const xls = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
    const rejected = await request(app.getHttpServer())
      .post('/api/v1/leads/import/preview')
      .set(auth(token))
      .attach('file', xls, 'leads.xls')
      .expect(400);
    expect(rejected.body.message).toMatch(/xls/i);
  });

  it('exports filtered leads with no-store headers and formula-safe values', async () => {
    const token = await adminToken();
    await request(app.getHttpServer())
      .post('/api/v1/leads')
      .set(auth(token))
      .send(
        leadPayload({
          companyName: '=CMD',
          contactName: 'Safe',
          phone: '+919800000050',
          email: 'safe@example.com',
        }),
      )
      .expect(201);

    const exported = await request(app.getHttpServer())
      .get('/api/v1/leads/export?search=CMD&format=xlsx')
      .set(auth(token))
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(exported.headers['cache-control']).toBe('no-store');
    expect(exported.headers['content-type']).toMatch(/spreadsheetml/);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.body as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    const values: string[] = [];
    sheet.eachRow((row) => {
      row.eachCell((cell) => values.push(String(cell.value ?? '')));
    });
    expect(values.some((value) => value.startsWith("'="))).toBe(true);
  });
});
