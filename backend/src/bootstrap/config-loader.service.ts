import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { PackApplierService } from '../shared/pack-applier.service';

/**
 * ConfigLoaderService
 *
 * On boot, reads niche.config.yaml, validates it against config.schema.json,
 * and reconciles the configuration into the database using PackApplierService.
 *
 * In single-tenant mode, this replaces the old tenant-based template install system.
 * The config file is the desired state — boot converges the DB to match it.
 */
@Injectable()
export class ConfigLoaderService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigLoaderService.name);
  private schema: any;

  constructor(
    private prisma: PrismaService,
    private packApplier: PackApplierService,
    private configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const configPath = this.resolveConfigPath();
    if (!configPath) {
      this.logger.warn('No NICHE_CONFIG_PATH set and no niche.config.yaml found — skipping config load');
      return;
    }

    this.logger.log(`Loading niche config from ${configPath}`);
    const raw = this.loadFile(configPath);
    const validated = this.validate(raw);
    await this.reconcile(validated);
    this.logger.log('Niche config reconciled successfully');
  }

  private resolveConfigPath(): string | null {
    const envPath = this.configService.get<string>('NICHE_CONFIG_PATH');
    if (envPath) return envPath;

    const candidates = [
      resolve(process.cwd(), 'niche.config.yaml'),
      resolve(process.cwd(), 'niche.config.yml'),
      resolve('/app', 'niche.config.yaml'),
      resolve('/app', 'niche.config.yml'),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  private loadFile(path: string): any {
    const content = readFileSync(path, 'utf-8');
    return yaml.load(content);
  }

  private validate(config: any): any {
    if (!this.schema) {
      const schemaPath = resolve(__dirname, '../../config.schema.json');
      if (!existsSync(schemaPath)) {
        this.logger.warn('config.schema.json not found — skipping validation');
        return config;
      }
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent);
    }

    // strict: false — the schema uses format keywords (e.g. "uri") ajv has no built-in
    // checker for; in strict mode ajv throws instead of just skipping that check.
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(this.schema);
    const valid = validate(config);

    if (!valid) {
      const errors = validate.errors?.map(e => `${e.instancePath}: ${e.message}`).join('; ');
      throw new Error(`niche.config.yaml validation failed: ${errors}`);
    }

    return config;
  }

  private async reconcile(config: any): Promise<void> {
    const packs = config.packs || [];
    if (packs.length === 0) {
      this.logger.warn('No packs defined in niche.config.yaml — nothing to reconcile');
      return;
    }

    // Ensure admin user exists (seeded from env)
    const adminUser = await this.ensureAdminUser(config);

    // Reconcile each pack idempotently
    for (const pack of packs) {
      try {
        const result = await this.packApplier.apply(pack, { userId: adminUser.id });
        this.logger.log(`Reconciled pack ${pack.type}: ${result.ids.length} records`);
      } catch (err: any) {
        this.logger.error(`Failed to reconcile pack ${pack.type}: ${err.message}`);
        throw err;
      }
    }

    // Update business settings with niche info + branding. Atomic upsert on the unique
    // `singleton` column so this boot-time reconcile can't race a concurrent caller
    // (e.g. BusinessSettingsService.ensure()) into creating two rows.
    const data = {
      businessName: config.niche?.display_name || '',
      timezone: 'UTC',
      logoUrl: config.branding?.logo_url || null,
      primaryColor: config.branding?.primary_color || '#0B5',
      labels: config.branding?.labels || {},
      industry: config.niche?.industry || null,
      toneExamples: config.agent?.tone_examples || [],
      goals: config.agent?.goals || [],
      compliance: config.agent?.compliance || [],
    };
    await this.prisma.businessSettings.upsert({
      where: { singleton: true },
      update: data,
      create: { ...data, singleton: true },
    });
  }

  private async ensureAdminUser(config: any) {
    const seedEmail = this.configService.get<string>('SEED_OWNER_EMAIL') || 'admin@' + (config.niche?.key || 'default') + '.local';
    const seedPasswordRaw = this.configService.get<string>('SEED_OWNER_PASSWORD') || 'dev-admin-change-me';

    let user = await this.prisma.user.findFirst({
      where: { email: seedEmail },
    });

    if (!user) {
      const hashedPassword = await bcrypt.hash(seedPasswordRaw, 12);
      user = await this.prisma.user.create({
        data: {
          name: config.niche?.display_name || 'Admin',
          email: seedEmail,
          password: hashedPassword,
          role: 'OWNER',
          active: true,
          tenantId: 'default-tenant',
        },
      });
      this.logger.log(`Created admin user: ${user.email}`);
    }

    return user;
  }
}
