import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './shared/logging.interceptor';
import { TenantInterceptor } from './shared/tenant.interceptor';
import { GlobalExceptionFilter } from './shared/exception.filter';
import helmet from 'helmet';
import * as express from 'express';

const DEFAULT_SECRETS = ['change-me', 'dev-secret', 'local-dev-jwt-secret-2024', 'local-dev-signed-url-secret'];

function validateSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || DEFAULT_SECRETS.includes(jwtSecret)) {
    throw new Error('JWT_SECRET must be changed from the default value');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
  if (process.env.REDIS_URL && process.env.REDIS_URL === 'redis://localhost:6379') {
    console.warn('WARNING: REDIS_URL is set to default localhost — this may not be intentional for production');
  }
}

async function bootstrap() {
  validateSecrets();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf: Buffer, _encoding: string) => {
      if (req.url?.startsWith('/webhooks/whatsapp') || req.url?.startsWith('/webhooks/payments')) {
        req.rawBody = buf;
      }
    },
  }));
  app.use(express.urlencoded({ limit: '1mb', extended: true, verify: (req: any, _res, buf: Buffer, _encoding: string) => {
    if (req.url?.startsWith('/webhooks/whatsapp') || req.url?.startsWith('/webhooks/payments')) {
      req.rawBody = buf;
    }
  }}));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalInterceptors(new TenantInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'stripe-signature', 'x-hub-signature-256'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Lead Automation API')
      .setDescription('Client Lead Automation Virtual Assistant')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.BACKEND_PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}
bootstrap();
