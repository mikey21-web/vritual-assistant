import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Webhook replay & failure retry', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  it('should record WHATSAPP_SEND failure and retry', async () => {
    const failure = await prisma.failureRecord.create({
      data: { type: 'WHATSAPP_SEND', severity: 'high', message: 'WhatsApp API timeout', provider: 'whatsapp', operation: 'send_message', retryable: true, status: 'open', attempts: 0 },
    });
    expect(failure.id).toBeDefined();

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'test@webhook-replay.com', password: 'x' });
    const token = login.status === 201 ? login.body.access_token : null;
    if (token) {
      const retryRes = await request(app.getHttpServer())
        .post(`/failures/${failure.id}/retry`).set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(retryRes.body.status).toBe('retrying');
      expect(retryRes.body.attempts).toBeGreaterThanOrEqual(1);
    }

    await prisma.failureRecord.delete({ where: { id: failure.id } });
  });

  it('should reject retry on non-retryable failure', async () => {
    const failure = await prisma.failureRecord.create({
      data: { type: 'WHATSAPP_SEND', severity: 'high', message: 'Non-retryable', retryable: false, status: 'open', attempts: 0 },
    });

    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'test@webhook-replay.com', password: 'x' });
    const token = login.status === 201 ? login.body.access_token : null;
    if (token) {
      await request(app.getHttpServer())
        .post(`/failures/${failure.id}/retry`).set('Authorization', `Bearer ${token}`)
        .expect(400);
    }

    await prisma.failureRecord.delete({ where: { id: failure.id } });
  });

  afterAll(async () => {
    await app.close();
  });
});
