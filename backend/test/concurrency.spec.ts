import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('Concurrency (double-booking prevention)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let ownerToken: string;
  let leadId: string;
  let unitId: string;
  let projectId: string;
  let towerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    tenantId = `conc-test-${Date.now()}`;
    await prisma.tenant.create({ data: { id: tenantId, name: tenantId, slug: tenantId, settings: {} } });
    const pwd = await bcrypt.hash('testpass', 1);
    const user = await prisma.user.create({ data: { tenantId, email: `owner-${tenantId}@test.com`, password: pwd, name: 'Owner', role: 'OWNER' } });

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: 'testpass' });
    ownerToken = login.body.access_token;

    const project = await prisma.project.create({ data: { tenantId, name: 'Concurrency Test Project', status: 'UNDER_CONSTRUCTION' } });
    projectId = project.id;
    const tower = await prisma.tower.create({ data: { projectId, name: 'Tower A', totalFloors: 10 } });
    towerId = tower.id;

    const unit = await prisma.unit.create({ data: { tenantId, towerId, projectId, unitNumber: 'C-001', unitType: '2BHK', floor: 5, areaSqft: 1000, price: 500000, status: 'AVAILABLE', version: 1 } });
    unitId = unit.id;

    const contact = await prisma.contact.create({ data: { tenantId, name: 'Concurrency Buyer', phone: `99999${Date.now()}` } });
    const lead = await prisma.lead.create({ data: { tenantId, contactId: contact.id, status: 'NEW', segment: 'HOT', source: 'MANUAL' } });
    leadId = lead.id;
  });

  it('should allow only one booking when two confirmations race on the same unit', async () => {
    const holdRes = await request(app.getHttpServer())
      .post('/unit-holds').set('Authorization', `Bearer ${ownerToken}`)
      .send({ leadId, unitId, tenantId });
    expect(holdRes.status).toBe(201);

    const costSheet = await prisma.costSheet.create({
      data: { tenantId, leadId, unitId, projectId, totalPaise: 50000000, status: 'APPROVED', snapshot: [] },
    });

    const results = await Promise.allSettled([
      request(app.getHttpServer()).post('/bookings').set('Authorization', `Bearer ${ownerToken}`).send({ leadId, unitId, costSheetId: costSheet.id }),
      request(app.getHttpServer()).post('/bookings').set('Authorization', `Bearer ${ownerToken}`).send({ leadId, unitId, costSheetId: costSheet.id }),
    ]);

    const successes = results.filter(r => r.status === 'fulfilled' && (r as any).value?.body?.id).length;
    expect(successes).toBeLessThanOrEqual(1);

    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    expect(unit?.status).toBe('BOOKED');
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.costSheet.deleteMany({ where: { tenantId } }).catch(() => {});
    await prisma.unitHold.deleteMany({ where: { tenantId } }).catch(() => {});
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


