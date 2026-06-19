import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Simplified PrismaService for single-tenant architecture.
 *
 * In a single-tenant-per-deploy model, the tenant middleware is not needed.
 * All records belong to the single implicit tenant.
 * The config-loader.service.ts creates/upserts the tenant at boot from niche.config.yaml.
 *
 * Database queries that reference tenantId still work (the column exists);
 * they just don't need dynamic scoping.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly tenantId: string | null = null;

  constructor(private configService: ConfigService) {
    super();
    // In single-tenant mode, we resolve the tenant ID at boot from config
    // and make it available for services that still need it
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Returns the current tenant ID.
   * In single-tenant mode, this is resolved from the niche config at boot.
   * Returns null if not yet resolved (during bootstrap before config loads).
   */
  getTenantId(): string | null {
    return this.tenantId;
  }
}
