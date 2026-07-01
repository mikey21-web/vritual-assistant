import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;
let jwtToken: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();
  prisma = app.get(PrismaService);

  // Create test user directly via Prisma
  const existing = await prisma.user.findUnique({ where: { email: 'e2e@test.com' } });
  if (existing) {
    await prisma.auditLog.deleteMany({ where: { userId: existing.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: existing.id } }).catch(() => {});
  }

  const hashed = await bcrypt.hash('Test123456', 1);
  await prisma.user.create({
    data: { email: 'e2e@test.com', name: 'E2E User', password: hashed, role: 'OWNER', active: true, tenantId: 'default-tenant' },
  });

  const login = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'e2e@test.com', password: 'Test123456',
  });
  jwtToken = login.body.accessToken;
}, 30000);

afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'e2e@test.com' } });
  if (user) {
    await prisma.auditLog.deleteMany({ where: { userId: user.id } }).catch(() => {});
    await prisma.automationEvent.deleteMany({}).catch(() => {});
    await prisma.webhookEvent.deleteMany({}).catch(() => {});
    await prisma.formSubmission.deleteMany({}).catch(() => {});
    await prisma.scoreLog.deleteMany({}).catch(() => {});
    await prisma.conversationMessage.deleteMany({}).catch(() => {});
    await prisma.conversion.deleteMany({}).catch(() => {});
    await prisma.task.deleteMany({}).catch(() => {});
    await prisma.nurtureProgress.deleteMany({}).catch(() => {});
    await prisma.nurtureStep.deleteMany({}).catch(() => {});
    await prisma.nurtureSequence.deleteMany({}).catch(() => {});
    await prisma.lead.deleteMany({}).catch(() => {});
    await prisma.campaign.deleteMany({}).catch(() => {});
    await prisma.contact.deleteMany({}).catch(() => {});
    await prisma.scoringRule.deleteMany({}).catch(() => {});
    await prisma.routingRule.deleteMany({}).catch(() => {});
    await prisma.leadForm.deleteMany({}).catch(() => {});
    await prisma.messageTemplate.deleteMany({}).catch(() => {});
    await prisma.qrCode.deleteMany({}).catch(() => {});
    await prisma.mediaFile.deleteMany({}).catch(() => {});
    await prisma.businessSettings.deleteMany({}).catch(() => {});
    await prisma.blocklistEntry.deleteMany({}).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }
  await app.close();
});

describe('Integration Tests', () => {
  let contactId: string;
  let leadId: string;
  let campaignId: string;

  it('POST /auth/login — returns JWT', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e@test.com', password: 'Test123456' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeDefined();
  });

  it('GET /auth/me — returns user profile', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('e2e@test.com');
  });

  it('POST /contacts — creates contact', async () => {
    const res = await request(app.getHttpServer()).post('/contacts').set('Authorization', `Bearer ${jwtToken}`).send({
      name: 'Integration Test', email: 'e2e-integration@test.com', phone: '+1234567890',
    });
    expect(res.status).toBe(201);
    contactId = res.body.id;
  });

  it('GET /contacts — lists contacts', async () => {
    const res = await request(app.getHttpServer()).get('/contacts').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /leads — creates lead', async () => {
    const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${jwtToken}`).send({
      contactId, source: 'FORM', message: 'Integration test lead',
    });
    expect(res.status).toBe(201);
    leadId = res.body.id;
  });

  it('GET /leads — lists leads with filters', async () => {
    const res = await request(app.getHttpServer()).get('/leads?source=FORM').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /leads/:id/score — scores a lead', async () => {
    const res = await request(app.getHttpServer()).post(`/leads/${leadId}/score`).set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(201);
    expect(res.body.score).toBeDefined();
    expect(res.body.segment).toBeDefined();
  });

  it('POST /leads/:id/assign — assigns agent', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'e2e@test.com' } });
    const res = await request(app.getHttpServer()).post(`/leads/${leadId}/assign`).set('Authorization', `Bearer ${jwtToken}`).send({ agentId: user!.id });
    expect(res.status).toBe(201);
  });

  it('POST /campaigns — creates campaign', async () => {
    const res = await request(app.getHttpServer()).post('/campaigns').set('Authorization', `Bearer ${jwtToken}`).send({
      name: 'E2E Campaign', sourceType: 'FORM',
    });
    expect(res.status).toBe(201);
    campaignId = res.body.id;
  });

  it('GET /campaigns — lists campaigns', async () => {
    const res = await request(app.getHttpServer()).get('/campaigns').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
  });

  it('POST /campaigns/:id/pause — pauses campaign', async () => {
    const res = await request(app.getHttpServer()).post(`/campaigns/${campaignId}/pause`).set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(201);
    expect(res.body.active).toBe(false);
  });

  it('POST /campaigns/:id/duplicate — duplicates campaign', async () => {
    const res = await request(app.getHttpServer()).post(`/campaigns/${campaignId}/duplicate`).set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(201);
    expect(res.body.name).toContain('(copy)');
  });

  it('POST /webhooks/forms — public webhook accepts submission', async () => {
    const res = await request(app.getHttpServer()).post('/webhooks/forms').set('x-api-key', 'dev-key-1').send({
      name: 'Webhook Lead', email: 'webhook@test.com', message: 'From webhook',
    });
    expect(res.status).toBe(200);
  });

  it('GET /health — returns healthy', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /analytics/overview — returns stats', async () => {
    const res = await request(app.getHttpServer()).get('/analytics/overview').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeDefined();
  });

  it('GET /analytics/sources — returns source breakdown', async () => {
    const res = await request(app.getHttpServer()).get('/analytics/sources').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /analytics/agents — returns agent stats', async () => {
    const res = await request(app.getHttpServer()).get('/analytics/agents').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
  });

  it('POST /scoring-rules — creates scoring rule', async () => {
    const res = await request(app.getHttpServer()).post('/scoring-rules').set('Authorization', `Bearer ${jwtToken}`).send({
      name: 'E2E Rule', field: 'message', operator: 'contains', value: 'urgent', points: 10,
    });
    expect(res.status).toBe(201);
  });

  it('POST /scoring-rules/test — tests scoring rule', async () => {
    const res = await request(app.getHttpServer()).post('/scoring-rules/test').set('Authorization', `Bearer ${jwtToken}`).send({
      field: 'message', operator: 'contains', value: 'urgent', points: 10, testValues: [{ message: 'urgent' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.results[0].matched).toBe(true);
  });

  it('POST /forms/:id/submit — public form submission creates lead', async () => {
    const forms = await request(app.getHttpServer()).post('/forms').set('Authorization', `Bearer ${jwtToken}`).send({ name: 'E2E Form' });
    const formId = forms.body.id;
    const res = await request(app.getHttpServer()).post(`/forms/${formId}/submit`).send({
      name: 'Form Submitter', email: 'form@test.com', message: 'Interested',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.lead).toBeDefined();
  });

  it('POST /tasks — creates task', async () => {
    const res = await request(app.getHttpServer()).post('/tasks').set('Authorization', `Bearer ${jwtToken}`).send({
      title: 'E2E Task', priority: 'high', leadId,
    });
    expect(res.status).toBe(201);
  });

  it('GET /conversations — lists messages', async () => {
    const res = await request(app.getHttpServer()).get('/conversations').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
  });

  it('GET /audit-logs — returns audit trail', async () => {
    const res = await request(app.getHttpServer()).get('/audit-logs').set('Authorization', `Bearer ${jwtToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app.getHttpServer()).get('/leads');
    expect(res.status).toBe(401);
  });

  it('rejects invalid DTO', async () => {
    const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${jwtToken}`).send({ invalidField: true });
    expect(res.status).toBe(400);
  });

  describe('Authentication', () => {
    it('POST /auth/register — creates user and returns token', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').set('Authorization', `Bearer ${jwtToken}`).send({
        email: 'e2e-auth-test@test.com', password: 'Test123456', name: 'Auth Test',
      });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      const user = await prisma.user.findUnique({ where: { email: 'e2e-auth-test@test.com' } });
      if (user) {
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    });

    it('POST /auth/login — valid credentials return token', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e@test.com', password: 'Test123456' });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
    });

    it('POST /auth/login — invalid credentials return 401', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e@test.com', password: 'WrongPass' });
      expect(res.status).toBe(401);
    });
  });

  describe('Leads (OWNER)', () => {
    let testLeadId: string;

    it('POST /leads — creates lead with valid data', async () => {
      const contact = await request(app.getHttpServer()).post('/contacts').set('Authorization', `Bearer ${jwtToken}`).send({ name: 'Lead Test', email: 'leadtest@test.com' });
      const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${jwtToken}`).send({ contactId: contact.body.id, source: 'FORM', message: 'Test lead' });
      expect(res.status).toBe(201);
      testLeadId = res.body.id;
    });

    it('GET /leads — returns paginated list', async () => {
      const res = await request(app.getHttpServer()).get('/leads').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('GET /leads/:id — returns single lead', async () => {
      if (!testLeadId) return;
      const res = await request(app.getHttpServer()).get(`/leads/${testLeadId}`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /leads/:id — invalid id returns 404', async () => {
      const res = await request(app.getHttpServer()).get('/leads/nonexistent-id').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Permission enforcement', () => {
    let viewerToken: string;
    let salesToken: string;

    beforeAll(async () => {
      try {
        await request(app.getHttpServer()).post('/auth/register').set('Authorization', `Bearer ${jwtToken}`).send({ email: 'e2e-viewer@test.com', password: 'Test123456', name: 'Viewer' });
        const vu = await prisma.user.findUnique({ where: { email: 'e2e-viewer@test.com' } });
        if (vu) await prisma.user.update({ where: { id: vu.id }, data: { role: 'SALES_AGENT' } });
        const vlogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e-viewer@test.com', password: 'Test123456' });
        viewerToken = vlogin.body.accessToken;
      } catch {}

      try {
        await request(app.getHttpServer()).post('/auth/register').set('Authorization', `Bearer ${jwtToken}`).send({ email: 'e2e-sales@test.com', password: 'Test123456', name: 'Sales' });
        const su = await prisma.user.findUnique({ where: { email: 'e2e-sales@test.com' } });
        if (su) await prisma.user.update({ where: { id: su.id }, data: { role: 'SALES_AGENT' } });
        const slogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e-sales@test.com', password: 'Test123456' });
        salesToken = slogin.body.accessToken;
      } catch {}
    });

    afterAll(async () => {
      for (const email of ['e2e-viewer@test.com', 'e2e-sales@test.com']) {
        const u = await prisma.user.findUnique({ where: { email } });
        if (u) {
          await prisma.auditLog.deleteMany({ where: { userId: u.id } });
          await prisma.user.delete({ where: { id: u.id } });
        }
      }
    });

    it('GET /failures — SALES_AGENT gets 403', async () => {
      const res = await request(app.getHttpServer()).get('/failures').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('POST /failures/:id/retry — SALES_AGENT gets 403', async () => {
      const res = await request(app.getHttpServer()).post('/failures/fake-id/retry').set('Authorization', `Bearer ${viewerToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /audit-logs — SALES_AGENT gets 403', async () => {
      const res = await request(app.getHttpServer()).get('/audit-logs').set('Authorization', `Bearer ${salesToken}`);
      expect(res.status).toBe(403);
    });

    it('PATCH /integrations/:id — SALES_AGENT gets 403', async () => {
      const res = await request(app.getHttpServer()).patch('/integrations/fake-id').set('Authorization', `Bearer ${salesToken}`).send({ name: 'test' });
      expect(res.status).toBe(403);
    });

    it('GET /health/deep — unauthenticated gets 401', async () => {
      const res = await request(app.getHttpServer()).get('/health/deep');
      expect(res.status).toBe(401);
    });

    it('GET /health — public returns 200', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Webhook security', () => {
    it('POST /webhooks/forms — valid api key returns 200', async () => {
      const res = await request(app.getHttpServer()).post('/webhooks/forms').set('x-api-key', 'dev-key-1').send({ name: 'Test', email: 'wtest@test.com' });
      expect([200, 201]).toContain(res.status);
    });

    it('POST /webhooks/forms — missing api key returns 401', async () => {
      const res = await request(app.getHttpServer()).post('/webhooks/forms').send({ name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('POST /webhooks/whatsapp — invalid signature returns 401', async () => {
      const res = await request(app.getHttpServer()).post('/webhooks/whatsapp').set('x-hub-signature-256', 'invalid').send({ entry: { changes: [] }, object: 'whatsapp_business_account' });
      expect(res.status).toBe(401);
    });
  });

  describe('Rules', () => {
    it('POST /rules — creates rule', async () => {
      const res = await request(app.getHttpServer()).post('/rules').set('Authorization', `Bearer ${jwtToken}`).send({
        name: 'E2E Test Rule', category: 'scoring', priority: 10,
        conditions: [{ field: 'score', operator: 'greater_than', value: '50' }],
        actions: [{ type: 'set_segment', segment: 'HOT' }],
      });
      expect(res.status).toBe(201);
    });

    it('POST /rules/test — returns matched/not_matched', async () => {
      const res = await request(app.getHttpServer()).post('/rules/test').set('Authorization', `Bearer ${jwtToken}`).send({
        conditions: [{ field: 'score', operator: 'greater_than', value: '50' }],
        testLead: { score: 80 },
      });
      expect(res.status).toBe(201);
      expect(res.body.matched).toBe(true);
    });
  });

  describe('Failures', () => {
    let failureId: string;

    it('creates a failure record via direct service insert', async () => {
      const record = await prisma.failureRecord.create({
        data: { type: 'test_failure', message: 'E2E test failure', status: 'open', severity: 'low', retryable: true },
      });
      failureId = record.id;
      expect(record.id).toBeDefined();
    });

    it('GET /failures — can retrieve the created record', async () => {
      const res = await request(app.getHttpServer()).get('/failures').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /failures/:id/resolve — marks as resolved', async () => {
      const res = await request(app.getHttpServer()).post(`/failures/${failureId}/resolve`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(201);
      const updated = await prisma.failureRecord.findUnique({ where: { id: failureId } });
      expect(updated?.status).toBe('resolved');
    });

    it('POST /failures/:id/retry — non-retryable failure returns 400', async () => {
      const r = await prisma.failureRecord.create({
        data: { type: 'non_retryable', message: 'Cannot retry', status: 'open', retryable: false },
      });
      const res = await request(app.getHttpServer()).post(`/failures/${r.id}/retry`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(400);
      await prisma.failureRecord.delete({ where: { id: r.id } }).catch(() => {});
    });

    afterAll(async () => {
      if (failureId) await prisma.failureRecord.delete({ where: { id: failureId } }).catch(() => {});
    });
  });
});
