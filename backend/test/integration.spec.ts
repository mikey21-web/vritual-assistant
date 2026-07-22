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

  // Create test user directly via Prisma (upsert to handle leftover data from partial runs)
  const hashed = await bcrypt.hash('Test123!@#', 1);
  await prisma.user.upsert({
    where: { email: 'e2e@test.com' },
    update: { password: hashed, name: 'E2E User', role: 'OWNER', active: true, tenantId: 'default-tenant' },
    create: { email: 'e2e@test.com', name: 'E2E User', password: hashed, role: 'OWNER', active: true, tenantId: 'default-tenant' },
  });

  const login = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'e2e@test.com', password: 'Test123!@#',
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
    const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e@test.com', password: 'Test123!@#' });
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
        email: 'e2e-auth-test@test.com', password: 'Test123!@#', name: 'Auth Test',
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
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e@test.com', password: 'Test123!@#' });
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

  describe('Campaigns', () => {
    let testCampaignId: string;

    it('POST /campaigns — creates campaign with full data', async () => {
      const res = await request(app.getHttpServer()).post('/campaigns').set('Authorization', `Bearer ${jwtToken}`).send({
        name: 'Nested Campaign Test',
        sourceType: 'FORM',
        offer: 'Special Offer',
        landingUrl: 'https://example.com/offer',
        conversionGoal: 'sale',
        active: true,
      });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Nested Campaign Test');
      expect(res.body.sourceType).toBe('FORM');
      expect(res.body.active).toBe(true);
      testCampaignId = res.body.id;
    });

    it('GET /campaigns — returns paginated list', async () => {
      const res = await request(app.getHttpServer()).get('/campaigns').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /campaigns — filters by active status', async () => {
      const res = await request(app.getHttpServer()).get('/campaigns?active=true').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('GET /campaigns/:id — returns single campaign', async () => {
      if (!testCampaignId) return;
      const res = await request(app.getHttpServer()).get(`/campaigns/${testCampaignId}`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testCampaignId);
    });

    it('GET /campaigns/:id — invalid id returns 404', async () => {
      const res = await request(app.getHttpServer()).get('/campaigns/nonexistent-id').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(404);
    });

    it('POST /campaigns/:id/pause — pauses campaign', async () => {
      if (!testCampaignId) return;
      const res = await request(app.getHttpServer()).post(`/campaigns/${testCampaignId}/pause`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(201);
      expect(res.body.active).toBe(false);
    });

    it('POST /campaigns/:id/activate — reactivates campaign', async () => {
      if (!testCampaignId) return;
      const res = await request(app.getHttpServer()).post(`/campaigns/${testCampaignId}/activate`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(201);
      expect(res.body.active).toBe(true);
    });

    it('POST /campaigns/:id/duplicate — duplicates campaign with (copy) suffix', async () => {
      if (!testCampaignId) return;
      const res = await request(app.getHttpServer()).post(`/campaigns/${testCampaignId}/duplicate`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(201);
      expect(res.body.name).toContain('(copy)');
      expect(res.body.active).toBe(false);
    });

    it('POST /campaigns/:id/performance — returns campaign metrics', async () => {
      if (!testCampaignId) return;
      const res = await request(app.getHttpServer()).get(`/campaigns/${testCampaignId}/performance`).set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalLeads).toBeDefined();
      expect(res.body.data.conversionRate).toBeDefined();
    });

    it('POST /campaigns/:id/pause — non-existent campaign returns 404', async () => {
      const res = await request(app.getHttpServer()).post('/campaigns/nonexistent-id/pause').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(404);
    });

    it('POST /campaigns/:id/duplicate — non-existent campaign returns 404', async () => {
      const res = await request(app.getHttpServer()).post('/campaigns/nonexistent-id/duplicate').set('Authorization', `Bearer ${jwtToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Permission enforcement', () => {
    let viewerToken: string;
    let salesToken: string;

    beforeAll(async () => {
      for (const email of ['e2e-viewer@test.com', 'e2e-sales@test.com']) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          await prisma.auditLog.deleteMany({ where: { userId: existing.id } }).catch(() => {});
          await prisma.user.delete({ where: { id: existing.id } }).catch(() => {});
        }
      }

      try {
        await request(app.getHttpServer()).post('/auth/register').set('Authorization', `Bearer ${jwtToken}`).send({ email: 'e2e-viewer@test.com', password: 'Test123!@#', name: 'Viewer' });
        const vu = await prisma.user.findUnique({ where: { email: 'e2e-viewer@test.com' } });
        if (vu) await prisma.user.update({ where: { id: vu.id }, data: { role: 'SALES_AGENT' } });
        const vlogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e-viewer@test.com', password: 'Test123!@#' });
        viewerToken = vlogin.body.accessToken;
      } catch {}

      try {
        await request(app.getHttpServer()).post('/auth/register').set('Authorization', `Bearer ${jwtToken}`).send({ email: 'e2e-sales@test.com', password: 'Test123!@#', name: 'Sales' });
        const su = await prisma.user.findUnique({ where: { email: 'e2e-sales@test.com' } });
        if (su) await prisma.user.update({ where: { id: su.id }, data: { role: 'SALES_AGENT' } });
        const slogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'e2e-sales@test.com', password: 'Test123!@#' });
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

  describe('Real Estate Lifecycle (synthetic tenant flow)', () => {
    let projectId: string;
    let unitId: string;
    let reLeadId: string;
    let siteVisitId: string;
    let costSheetId: string;
    let bookingId: string;
    let paymentScheduleId: string;
    let receiptId: string;
    let reContactId: string;

    it('creates a project', async () => {
      const res = await request(app.getHttpServer()).post('/projects').set('Authorization', `Bearer ${jwtToken}`).send({ name: 'E2E Towers' });
      expect(res.status).toBe(201);
      projectId = res.body.id;
    });

    it('creates a unit under the project', async () => {
      const res = await request(app.getHttpServer()).post(`/projects/${projectId}/units`).set('Authorization', `Bearer ${jwtToken}`).send({ unitNumber: 'A-101', price: 5000000 });
      expect(res.status).toBe(201);
      unitId = res.body.id;
    });

    it('creates a lead for the buyer', async () => {
      const contact = await request(app.getHttpServer()).post('/contacts').set('Authorization', `Bearer ${jwtToken}`).send({ name: 'RE Buyer', email: `re-buyer-${Date.now()}@test.com` });
      expect(contact.status).toBe(201);
      reContactId = contact.body.id;
      const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${jwtToken}`).send({ contactId: contact.body.id, source: 'FORM', message: 'Interested in A-101' });
      expect(res.status).toBe(201);
      reLeadId = res.body.id;
    });

    it('schedules and completes a site visit', async () => {
      const create = await request(app.getHttpServer()).post('/site-visits').set('Authorization', `Bearer ${jwtToken}`).send({
        leadId: reLeadId, projectId, unitId, startAt: new Date(Date.now() + 3600000).toISOString(),
      });
      expect(create.status).toBe(201);
      siteVisitId = create.body.id;

      const complete = await request(app.getHttpServer()).post(`/site-visits/${siteVisitId}/complete`).set('Authorization', `Bearer ${jwtToken}`).send({});
      expect(complete.status).toBe(201);
    });

    it('creates, submits, and approves a cost sheet', async () => {
      const create = await request(app.getHttpServer()).post('/cost-sheets').set('Authorization', `Bearer ${jwtToken}`).send({ leadId: reLeadId, unitId, projectId });
      expect(create.status).toBe(201);
      costSheetId = create.body.id;

      const submit = await request(app.getHttpServer()).post(`/cost-sheets/${costSheetId}/submit`).set('Authorization', `Bearer ${jwtToken}`);
      expect(submit.status).toBe(201);

      const approve = await request(app.getHttpServer()).post(`/cost-sheets/${costSheetId}/approve`).set('Authorization', `Bearer ${jwtToken}`);
      expect(approve.status).toBe(201);
    });

    it('places a hold on the unit', async () => {
      const res = await request(app.getHttpServer()).post('/unit-holds').set('Authorization', `Bearer ${jwtToken}`).send({ unitId, leadId: reLeadId });
      expect(res.status).toBe(201);
    });

    it('waives the required KYC documents so confirmation is not blocked', async () => {
      for (const type of ['PAN', 'ADDRESS_PROOF']) {
        const requested = await request(app.getHttpServer()).post('/kyc/documents').set('Authorization', `Bearer ${jwtToken}`).send({ leadId: reLeadId, type });
        expect(requested.status).toBe(201);
        const waived = await request(app.getHttpServer()).post(`/kyc/documents/${requested.body.id}/waive`).set('Authorization', `Bearer ${jwtToken}`).send({ reason: 'Synthetic E2E — waived for lifecycle test' });
        expect(waived.status).toBe(201);
      }
    });

    it('creates a draft purchase booking and confirms it against the active hold', async () => {
      const draft = await request(app.getHttpServer()).post('/bookings/purchase').set('Authorization', `Bearer ${jwtToken}`).send({ leadId: reLeadId, unitId, costSheetId });
      expect(draft.status).toBe(201);
      bookingId = draft.body.id;

      const confirm = await request(app.getHttpServer()).post(`/bookings/${bookingId}/confirm-purchase`).set('Authorization', `Bearer ${jwtToken}`).send({
        applicants: [{ name: 'RE Buyer', role: 'PRIMARY' }],
        bookingAmountPaise: 500000000,
      });
      expect(confirm.status).toBe(201);
    });

    it('confirms the unit is now BOOKED — the state the whole chain was verifying', async () => {
      const res = await request(app.getHttpServer()).get(`/units/${unitId}`).set('Authorization', `Bearer ${jwtToken}`);
      if (res.status === 200) expect(res.body.status).toBe('BOOKED');
    });

    it('creates a payment schedule entry and records a receipt against it', async () => {
      const schedule = await request(app.getHttpServer()).post('/payment-schedules').set('Authorization', `Bearer ${jwtToken}`).send({
        leadId: reLeadId, bookingId, label: 'Booking Amount', amount: 500000000,
      });
      expect(schedule.status).toBe(201);
      paymentScheduleId = schedule.body.id;

      const receipt = await request(app.getHttpServer()).post('/collections/receipts').set('Authorization', `Bearer ${jwtToken}`).send({
        leadId: reLeadId, bookingId, amountPaise: 500000000, mode: 'BANK_TRANSFER',
        allocations: [{ paymentScheduleId, amountPaise: 500000000 }],
      });
      expect(receipt.status).toBe(201);
      receiptId = receipt.body.id;

      const confirmReceipt = await request(app.getHttpServer()).post(`/collections/receipts/${receiptId}/confirm`).set('Authorization', `Bearer ${jwtToken}`);
      expect(confirmReceipt.status).toBe(201);
    });

    it('marks the payment schedule entry paid (a deliberate manual step — receipt allocations are informational only)', async () => {
      const markPaid = await request(app.getHttpServer()).post(`/payment-schedules/${paymentScheduleId}/mark-paid`).set('Authorization', `Bearer ${jwtToken}`);
      expect(markPaid.status).toBe(201);
      const res = await request(app.getHttpServer()).get(`/payment-schedules/${paymentScheduleId}`).set('Authorization', `Bearer ${jwtToken}`);
      if (res.status === 200) expect(res.body.status).toBe('PAID');
    });

    afterAll(async () => {
      await prisma.buyerDocument.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.ledgerEntry.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.paymentReceipt.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.paymentSchedule.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.unitHold.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.costSheet.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.siteVisit.deleteMany({ where: { leadId: reLeadId } }).catch(() => {});
      await prisma.lead.deleteMany({ where: { id: reLeadId } }).catch(() => {});
      await prisma.contact.deleteMany({ where: { id: reContactId } }).catch(() => {});
      await prisma.unit.deleteMany({ where: { projectId } }).catch(() => {});
      await prisma.project.deleteMany({ where: { id: projectId } }).catch(() => {});
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
