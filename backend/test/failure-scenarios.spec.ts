import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Failure scenarios', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('should return 401 for invalid WhatsApp webhook signature', async () => {
    const res = await request(app.getHttpServer())
      .post('/webhooks/whatsapp')
      .set('x-hub-signature-256', 'sha256=invalid')
      .send({ object: 'whatsapp_business_account', entry: [] });
    expect(res.status).toBe(401);
  });

  it('should reject duplicate webhook with same idempotency key', async () => {
    const key = `idemp-${Date.now()}`;
    const body = { event: 'test', data: { msg: 'hello' } };
    const first = await request(app.getHttpServer())
      .post('/webhooks/generic').set('Idempotency-Key', key).send(body);
    const second = await request(app.getHttpServer())
      .post('/webhooks/generic').set('Idempotency-Key', key).send(body);
    expect([201, 202]).toContain(first.status);
    expect(second.status).toBe(409);
  });

  it('should record and retry a failure up to maxAttempts', async () => {
    const record = await prisma.failureRecord.create({
      data: { type: 'TEST_FAILURE', severity: 'medium', message: 'test failure for retry test', retryable: true, maxAttempts: 2, status: 'open', attempts: 0 },
    });
    expect(record.id).toBeDefined();

    const tokenRes = await request(app.getHttpServer()).post('/auth/login').send({ email: 'nobody@test.com', password: 'x' });
    const token = tokenRes.status === 201 ? tokenRes.body.access_token : null;

    if (token) {
      await request(app.getHttpServer())
        .post(`/failures/${record.id}/retry`).set('Authorization', `Bearer ${token}`)
        .expect(201);
    }

    const updated = await prisma.failureRecord.findUnique({ where: { id: record.id } });
    expect(updated?.attempts).toBeGreaterThanOrEqual(1);

    await prisma.failureRecord.update({ where: { id: record.id }, data: { status: 'resolved' } });
  });

  it('should record PAYMENT_FAILURE and query by type', async () => {
    await prisma.failureRecord.create({ data: { type: 'PAYMENT_FAILURE', errorCode: 'insufficient_funds', severity: 'high', message: 'Insufficient funds', status: 'open' } });
    await prisma.failureRecord.create({ data: { type: 'PAYMENT_FAILURE', errorCode: 'card_expired', severity: 'medium', message: 'Card expired', status: 'open' } });

    const openPayments = await prisma.failureRecord.findMany({ where: { type: 'PAYMENT_FAILURE', status: 'open' } });
    expect(openPayments.length).toBeGreaterThanOrEqual(2);
    expect(openPayments.map(r => r.errorCode)).toContain('insufficient_funds');
    expect(openPayments.map(r => r.errorCode)).toContain('card_expired');

    await prisma.failureRecord.deleteMany({ where: { type: 'PAYMENT_FAILURE' } });
  });

  afterAll(async () => {
    await prisma.failureRecord.deleteMany({ where: { type: { in: ['TEST_FAILURE', 'PAYMENT_FAILURE'] } } }).catch(() => {});
    await app.close();
  });
});
