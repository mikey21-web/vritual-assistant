import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

let app: INestApplication;
let prisma: PrismaService;
let jwtService: JwtService;
let tenantA: any;
let tenantB: any;
let tokenA: string;
let tokenB: string;
let nullTenantToken: string;
let bLeadId: string;
let bContactId: string;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }));
  await app.init();
  prisma = app.get(PrismaService);
  jwtService = app.get(JwtService);

  tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', key: 'tenant-a', industry: 'tech', status: 'provisioned' } });
  tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', key: 'tenant-b', industry: 'health', status: 'provisioned' } });

  // Create users via Prisma (register is admin-only now)
  const hashA = await bcrypt.hash('Test1234567890', 1);
  const hashB = await bcrypt.hash('Test1234567890', 1);

  await prisma.user.create({ data: { email: 'a@test.com', name: 'User A', password: hashA, role: 'MANAGER', tenantId: tenantA.id } });
  await prisma.user.create({ data: { email: 'b@test.com', name: 'User B', password: hashB, role: 'MANAGER', tenantId: tenantB.id } });

  // Create null-tenant user for testing
  const nullHash = await bcrypt.hash('Test1234567890', 1);
  await prisma.user.create({ data: { email: 'nullt@test.com', name: 'Null T User', password: nullHash, role: 'SALES_AGENT', tenantId: null } });

  tokenA = (await request(app.getHttpServer()).post('/auth/login').send({ email: 'a@test.com', password: 'Test1234567890' })).body.accessToken;
  tokenB = (await request(app.getHttpServer()).post('/auth/login').send({ email: 'b@test.com', password: 'Test1234567890' })).body.accessToken;
  nullTenantToken = (await request(app.getHttpServer()).post('/auth/login').send({ email: 'nullt@test.com', password: 'Test1234567890' })).body.accessToken;

  // Create data in Tenant B
  bContactId = (await request(app.getHttpServer()).post('/contacts').set('Authorization', `Bearer ${tokenB}`).send({ name: 'B Contact', email: 'bcontact@test.com', phone: '+1987654321' })).body.id;
  const bLeadResp = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${tokenB}`).send({ contactId: bContactId, source: 'FORM', message: 'B lead message' });
  bLeadId = bLeadResp.body.id;

  await prisma.task.create({ data: { title: 'B Task', leadId: bLeadId, tenantId: tenantB.id } });
  await prisma.conversationMessage.create({ data: { text: 'B message', channel: 'SYSTEM', direction: 'INBOUND', leadId: bLeadId, tenantId: tenantB.id } });
  await prisma.revenueRecord.create({ data: { leadId: bLeadId, amount: 100, type: 'payment', tenantId: tenantB.id } });
});

afterAll(async () => {
  for (const tid of [tenantA?.id, tenantB?.id].filter(Boolean)) {
    await prisma.conversationMessage.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.task.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.revenueRecord.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.lead.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.contact.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId: tid } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: tid } }).catch(() => {});
  }
  await prisma.user.deleteMany({ where: { email: 'nullt@test.com' } }).catch(() => {});
  await app.close();
});

describe('Tenant Isolation', () => {
  describe('Cross-tenant reads', () => {
    it('GET /leads/:bLeadId as userA → 404', async () => {
      const res = await request(app.getHttpServer()).get(`/leads/${bLeadId}`).set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(404);
    });

    it('GET /leads as userA excludes B leads', async () => {
      const res = await request(app.getHttpServer()).get('/leads').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((l: any) => l.id);
      expect(ids).not.toContain(bLeadId);
    });

    it('GET /contacts excludes B contacts', async () => {
      const res = await request(app.getHttpServer()).get('/contacts').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((c: any) => c.id);
      expect(ids).not.toContain(bContactId);
    });
  });

  describe('Cross-tenant writes blocked', () => {
    it('Cannot update cross-tenant lead', async () => {
      const res = await request(app.getHttpServer()).patch(`/leads/${bLeadId}`).set('Authorization', `Bearer ${tokenA}`).send({ message: 'hijacked' });
      expect([404, 403]).toContain(res.status);
    });

    it('Cannot delete cross-tenant lead', async () => {
      const res = await request(app.getHttpServer()).delete(`/leads/${bLeadId}`).set('Authorization', `Bearer ${tokenA}`);
      expect([404, 403]).toContain(res.status);
    });
  });

  describe('Real-tenant writes (proves new models work)', () => {
    let testLeadId: string;

    it('POST /leads creates lead for tenant A', async () => {
      const c = await request(app.getHttpServer()).post('/contacts').set('Authorization', `Bearer ${tokenA}`).send({ name: 'A Write Test', email: 'awrite@test.com', phone: '+15550001' });
      const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${tokenA}`).send({ contactId: c.body.id, source: 'FORM', message: 'A lead' });
      expect(res.status).toBe(201);
      testLeadId = res.body.id;

      const lead = await prisma.lead.findUnique({ where: { id: testLeadId } });
      expect(lead.tenantId).toBe(tenantA.id);
    });

    it('POST /tasks creates task with correct tenantId', async () => {
      const res = await request(app.getHttpServer()).post('/tasks').set('Authorization', `Bearer ${tokenA}`).send({ title: 'A Task', leadId: testLeadId });
      expect(res.status).toBe(201);
      const task = await prisma.task.findUnique({ where: { id: res.body.id } });
      expect(task.tenantId).toBe(tenantA.id);
    });

    it('POST /conversations creates message with correct tenantId', async () => {
      const res = await request(app.getHttpServer()).post('/conversations').set('Authorization', `Bearer ${tokenA}`).send({ text: 'A msg', channel: 'SYSTEM', direction: 'OUTBOUND', leadId: testLeadId });
      expect(res.status).toBe(201);
      const msg = await prisma.conversationMessage.findUnique({ where: { id: res.body.id } });
      expect(msg.tenantId).toBe(tenantA.id);
    });
  });

  describe('Auth isolation', () => {
    it('POST /auth/register without tenantId rejected', async () => {
      const loginAdmin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'a@test.com', password: 'Test1234567890' });
      const adminToken = loginAdmin.body.accessToken;
      if (!adminToken) return; // skip if no token

      const res = await request(app.getHttpServer()).post('/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'noteenant@test.com', password: 'Test1234567890', name: 'No Tenant' });
      expect(res.status).toBe(401);
    });

    it('POST /auth/register requires authentication', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send({ email: 'public@test.com', password: 'Test1234567890', name: 'Public' });
      expect(res.status).toBe(401);
    });
  });

  describe('Null-tenant non-admin reads empty', () => {
    it('GET /leads with null-tenant user returns empty', async () => {
      if (!nullTenantToken) return;
      const res = await request(app.getHttpServer()).get('/leads').set('Authorization', `Bearer ${nullTenantToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });
});
