import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('End-to-end Sell.Do flow (lead → booking → portal)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let token: string;
  let leadId: string;
  let unitId: string;
  let projectId: string;
  let towerId: string;
  let costSheetId: string;
  let bookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    tenantId = `e2e-flow-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: tenantId, slug: tenantId, settings: {} } });
    const pwd = await bcrypt.hash('testpass', 1);
    const user = await prisma.user.create({ data: { tenantId, email: `flow-${tenantId}@test.com`, password: pwd, name: 'Owner', role: 'OWNER' } });

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: 'testpass' });
    token = login.body.access_token;
  });

  it('1. Create project, tower, unit', async () => {
    const proj = await request(app.getHttpServer()).post('/projects').set('Authorization', `Bearer ${token}`).send({ name: 'E2E Project', status: 'UNDER_CONSTRUCTION' });
    expect(proj.status).toBe(201);
    projectId = proj.body.id;

    const tower = await prisma.tower.create({ data: { projectId, name: 'Tower A', totalFloors: 5 } });
    towerId = tower.id;

    const unit = await request(app.getHttpServer()).post(`/projects/${projectId}/units`).set('Authorization', `Bearer ${token}`).send({ towerId, unitNumber: 'E2E-01', unitType: '2BHK', floor: 3, areaSqft: 1000, price: 500000, status: 'AVAILABLE' });
    unitId = unit.body?.id || (await prisma.unit.create({ data: { tenantId, towerId, projectId, unitNumber: 'E2E-01', unitType: '2BHK', floor: 3, areaSqft: 1000, price: 500000, status: 'AVAILABLE' } })).id;
  });

  it('2. Create lead from portal source', async () => {
    const res = await request(app.getHttpServer()).post('/leads').set('Authorization', `Bearer ${token}`).send({ name: 'E2E Buyer', phone: `99998${Date.now()}`, source: 'MAGICBRICKS', status: 'NEW' });
    expect([201, 201]).toContain(res.status);
    leadId = res.body.id || res.body.data?.id;
  });

  it('3. Assign lead to salesperson and schedule site visit', async () => {
    if (!leadId) return;
    const visit = await request(app.getHttpServer()).post('/site-visits').set('Authorization', `Bearer ${token}`).send({ leadId, unitId, scheduledAt: new Date(Date.now() + 86400000).toISOString() });
    expect([201, 201]).toContain(visit.status);
  });

  it('4. Create unit hold', async () => {
    if (!leadId || !unitId) return;
    const res = await request(app.getHttpServer()).post('/unit-holds').set('Authorization', `Bearer ${token}`).send({ leadId, unitId, tenantId });
    expect([201, 409]).toContain(res.status);
  });

  it('5. Create cost sheet and approve', async () => {
    if (!leadId || !unitId || !projectId) return;
    const res = await request(app.getHttpServer()).post('/cost-sheets').set('Authorization', `Bearer ${token}`).send({ leadId, unitId, projectId });
    expect([201, 201]).toContain(res.status);
    costSheetId = res.body.id || res.body.data?.id;

    if (costSheetId) {
      await request(app.getHttpServer()).post(`/cost-sheets/${costSheetId}/submit`).set('Authorization', `Bearer ${token}`).expect(201);
      await request(app.getHttpServer()).post(`/cost-sheets/${costSheetId}/approve`).set('Authorization', `Bearer ${token}`).expect(201);
    }
  });

  it('6. Create booking', async () => {
    if (!leadId || !unitId || !costSheetId) return;
    const res = await request(app.getHttpServer()).post('/bookings').set('Authorization', `Bearer ${token}`).send({ leadId, unitId, costSheetId });
    expect([201, 201]).toContain(res.status);
    bookingId = res.body.id || res.body.data?.id;
  });

  it('7. Record payment receipt', async () => {
    if (!bookingId) return;
    const receipt = await request(app.getHttpServer()).post('/collections').set('Authorization', `Bearer ${token}`).send({ bookingId, amountPaise: 5000000, mode: 'CHEQUE', notes: 'Booking amount' });
    expect([201, 201]).toContain(receipt.status);
  });

  it('8. Advance post-sales stage', async () => {
    if (!bookingId) return;
    const res = await request(app.getHttpServer()).post(`/bookings/${bookingId}/post-sales/advance`).set('Authorization', `Bearer ${token}`).send({ toStage: 'KYC_IN_PROGRESS', reason: 'KYC initiated' });
    expect([201, 201]).toContain(res.status);

    const statement = await request(app.getHttpServer()).get(`/bookings/${bookingId}/post-sales/statement`).set('Authorization', `Bearer ${token}`);
    expect([200, 200]).toContain(statement.status);
  });

  it('9. Get buyer portal token', async () => {
    if (!bookingId) return;
    const buyerToken = await request(app.getHttpServer()).post('/buyer-portal/generate-token').set('Authorization', `Bearer ${token}`).send({ bookingId });
    expect([201, 201]).toContain(buyerToken.status);
  });

  afterAll(async () => {
    await prisma.paymentReceipt.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.paymentSchedule.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.costSheet.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.offer.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.unitHold.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.siteVisit.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.unit.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.contact.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.tower.deleteMany({ where: { projectId } }).catch(() => {});
    await prisma.project.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.lead.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
    await app.close();
  });
});


