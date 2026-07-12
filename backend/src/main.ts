import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestTimeoutException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './shared/logging.interceptor';
import { GlobalExceptionFilter } from './shared/exception.filter';
import { SentryService } from './shared/sentry.service';
import { IdempotencyMiddleware } from './shared/idempotency.middleware';
import { CorrelationIdMiddleware } from './shared/correlation-id.middleware';
import { TenantResolverMiddleware } from './shared/tenant-resolver.middleware';
import { validateEnv } from './config/env.validation';
import helmet from 'helmet';
import * as express from 'express';

const logger = new Logger('Bootstrap');

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise} reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
  process.exit(1);
});

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  app.enableShutdownHooks();

  const sentryService = app.get(SentryService);

  app.use(express.json({
    limit: '5mb',
    verify: (req: any, _res, buf: Buffer, _encoding: string) => {
      if (req.url?.startsWith('/webhooks/whatsapp') || req.url?.startsWith('/webhooks/telegram') || req.url?.startsWith('/webhooks/payments')) {
        req.rawBody = buf;
      }
    },
  }));
  app.use(express.urlencoded({ limit: '5mb', extended: true, verify: (req: any, _res, buf: Buffer, _encoding: string) => {
    if (req.url?.startsWith('/webhooks/whatsapp') || req.url?.startsWith('/webhooks/telegram') || req.url?.startsWith('/webhooks/payments')) {
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
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }));
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));

  // Correlation ID for request tracing
  const correlationMw = new CorrelationIdMiddleware();
  app.use((req: any, res: any, next: any) => correlationMw.use(req, res, next));

  // Tenant resolver
  const tenantMw = new TenantResolverMiddleware();
  app.use((req: any, _res: any, next: any) => tenantMw.use(req, _res, next));

  // Idempotency middleware for write dedup
  const idempotencyMw = new IdempotencyMiddleware();
  app.use((req: any, res: any, next: any) => idempotencyMw.use(req, res, next));

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  const corsOrigin = process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('CORS_ORIGIN must be set in production'); })()
    : 'http://localhost:3000');

  // The web chat widget is embedded on arbitrary client websites, so its
  // endpoints can't be pinned to the single dashboard CORS_ORIGIN above.
  // They're authenticated by a public site key (not cookies), so a wildcard
  // origin without credentials is safe here — same trust model as a Stripe
  // publishable key. Everything else keeps the normal locked-down policy.
  app.use((req: any, res: any, next: any) => {
    const isWebchat = req.path?.startsWith('/webhooks/webchat');
    res.header('Access-Control-Allow-Origin', isWebchat ? '*' : corsOrigin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key,stripe-signature,x-hub-signature-256,Idempotency-Key');
    res.header('Access-Control-Max-Age', '86400');
    if (!isWebchat) res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Sentry error handler (after CORS, before error filter)
  app.use(sentryService.getExpressErrorHandler());

  // Global request timeout
  app.use((req: any, res: any, next: any) => {
    const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
    req.setTimeout(timeout, () => {
      if (!res.headersSent) {
        res.status(408).json({ statusCode: 408, message: 'Request timeout' });
      }
    });
    next();
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
  const server = await app.listen(port);
  server.keepAliveTimeout = 65000; // Slightly above ALB idle timeout (60s)
  logger.log(`Backend running on port ${port}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      logger.log('HTTP server closed');
      await app.close();
      logger.log('Application closed');
      process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrap();
