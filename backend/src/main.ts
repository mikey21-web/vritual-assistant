import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './shared/logging.interceptor';
import { GlobalExceptionFilter } from './shared/exception.filter';
import helmet from 'helmet';
import * as express from 'express';

const DEFAULT_SECRETS = ['change-me', 'dev-secret', 'local-dev-jwt-secret-2024', 'local-dev-signed-url-secret'];

function validateSecrets() {
  const isDev = process.env.NODE_ENV !== 'production';
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL'];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  const jwtSecret = process.env.JWT_SECRET!;
  const signedUrlSecret = process.env.SIGNED_URL_SECRET;
  const integrationsKey = process.env.INTEGRATIONS_ENC_KEY;
  const agentKey = process.env.AGENT_INBOUND_KEY;
  const serviceJwt = process.env.AGENT_SERVICE_JWT;

  for (const [name, value] of [['JWT_SECRET', jwtSecret], ['SIGNED_URL_SECRET', signedUrlSecret], ['INTEGRATIONS_ENC_KEY', integrationsKey]] as const) {
    if (value && DEFAULT_SECRETS.includes(value) && !isDev) {
      throw new Error(`${name} must be changed from the default value in production`);
    }
  }
  if (jwtSecret === 'local-dev-jwt-secret-2024' && !isDev) {
    throw new Error('JWT_SECRET must be changed from the default value in production');
  }
  if (!isDev) {
    if (!agentKey) throw new Error('AGENT_INBOUND_KEY is required in production');
    if (!serviceJwt) throw new Error('AGENT_SERVICE_JWT is required in production');
    if (!integrationsKey) throw new Error('INTEGRATIONS_ENC_KEY is required in production');
  }
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET must be at least 16 characters long');
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

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  }));
  app.useGlobalInterceptors(new LoggingInterceptor());
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
