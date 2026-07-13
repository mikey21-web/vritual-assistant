import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

const TENANT_MODELS = ['User', 'Contact', 'Lead', 'Campaign', 'Integration', 'CallLog', 'Device'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      log: process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['query', 'warn', 'error'],
    });
    // Connection pool: configured via DATABASE_URL params (e.g., ?connection_limit=10&pool_timeout=10)
    this.logPoolConfig();

    // Prisma middleware to inject tenantId on create
    this.$use(async (params, next) => {
      if (TENANT_MODELS.includes(params.model || '') && params.action === 'create') {
        const args = params.args;
        const data = args.data;
        if (data && !data.tenantId && !data.tenant) {
          const globalTenantId = (global as any).__tenantId || process.env.DEFAULT_TENANT_ID || 'default-tenant';
          if (params.model === 'User' || params.model === 'Contact' || params.model === 'Lead' ||
              params.model === 'Campaign' || params.model === 'Integration' ||
              params.model === 'CallLog' || params.model === 'Device') {
            data.tenantId = globalTenantId;
          }
        }
      }
      return next(params);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database');
      this.logger.log(`Pool config: connection_limit=${process.env.PRISMA_CONNECTION_LIMIT || '10 (via DATABASE_URL)'}, pool_timeout=${process.env.PRISMA_POOL_TIMEOUT || '10s (via DATABASE_URL)'}`);
    } catch (err) {
      this.logger.error('Database connection failed, retrying...', err);
      // Retry with backoff
      for (let i = 1; i <= 5; i++) {
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, i), 30000)));
        try {
          await this.$connect();
          this.logger.log(`Connected to database on retry ${i}`);
          return;
        } catch (e) {
          this.logger.warn(`Database retry ${i} failed`);
        }
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  private logPoolConfig() {
    const url = process.env.DATABASE_URL || '';
    const params = url.split('?')[1] || '';
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || (params.match(/connection_limit=(\d+)/)?.[1] ?? 'default');
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || (params.match(/pool_timeout=(\d+)/)?.[1] ?? 'default');
    this.logger.log(`Prisma pool: connection_limit=${connectionLimit}, pool_timeout=${poolTimeout}s`);
  }
}
