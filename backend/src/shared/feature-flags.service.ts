import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private cache: Map<string, boolean> = new Map();
  private lastRefresh = 0;

  constructor(private prisma: PrismaService) {}

  async isEnabled(key: string): Promise<boolean> {
    // Refresh cache every 60 seconds
    if (Date.now() - this.lastRefresh > 60000) await this.refreshCache();
    return this.cache.get(key) ?? false;
  }

  /**
   * Like isEnabled, but returns `defaultValue` when the flag has never been set.
   * Use this for kill-switches that must default to "on" until an admin explicitly
   * disables them — isEnabled()'s default of false would otherwise silently
   * block the feature for every deployment that never touched the flag.
   */
  async isEnabledDefault(key: string, defaultValue: boolean): Promise<boolean> {
    if (Date.now() - this.lastRefresh > 60000) await this.refreshCache();
    return this.cache.has(key) ? this.cache.get(key)! : defaultValue;
  }

  async refreshCache(): Promise<void> {
    try {
      const flags = await this.prisma.featureFlag.findMany();
      this.cache = new Map(flags.map(f => [f.key, f.enabled]));
      this.lastRefresh = Date.now();
    } catch (err: any) {
      this.logger.warn(`Failed to refresh feature flags: ${err.message}`);
    }
  }

  async enable(key: string): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled: true },
      create: { key, enabled: true },
    });
    this.cache.set(key, true);
  }

  async disable(key: string): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled: false },
      create: { key, enabled: false },
    });
    this.cache.set(key, false);
  }

  async findAll(): Promise<{ key: string; enabled: boolean; description: string | null }[]> {
    await this.refreshCache();
    return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  }
}
