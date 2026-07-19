import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_QUIET_HOURS_START = 21; // 9pm
const DEFAULT_QUIET_HOURS_END = 8; // 8am
const DEFAULT_DAILY_CAP = 50;
const DEFAULT_LEAD_COOLDOWN_HOURS = 24;

/** Every autonomous action belongs to exactly one category so an owner can dial autonomy per category instead of one global on/off switch. */
export type AutonomyCategory = 'lead_assignment' | 'lead_messaging' | 'task_escalation' | 'jarvis_tools';
export const AUTONOMY_CATEGORIES: AutonomyCategory[] = ['lead_assignment', 'lead_messaging', 'task_escalation', 'jarvis_tools'];

/** off: never acts, only reports. observe: same as off today — reserved for a future "draft for approval" mode. autonomous: acts on its own, subject to the other guardrails below. */
export type AutonomyLevel = 'off' | 'observe' | 'autonomous';

/**
 * Deterministic, pre-LLM checks that gate every autonomous (unprompted)
 * action Mikey takes. These run before any autonomous write — a per-category
 * on/off dial the owner controls, quiet hours, a per-lead cooldown so the
 * same lead never gets nudged twice in a day, and a daily cap so a bug can't
 * fire hundreds of actions unattended. Cheap and reliable on purpose: the LLM
 * decides *what* to do, this decides whether it's allowed to do it at all
 * right now.
 */
@Injectable()
export class AutonomyGuardrailsService {
  constructor(private prisma: PrismaService) {}

  private async getTenantSettings(tenantId: string): Promise<Record<string, any>> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    return (tenant?.settings as Record<string, any>) || {};
  }

  /** New tenants default to 'autonomous' for every category so existing behavior doesn't silently change when this ships. */
  async getCategoryLevel(tenantId: string, category: AutonomyCategory): Promise<AutonomyLevel> {
    const settings = await this.getTenantSettings(tenantId);
    return settings.mikeyAutonomyCategories?.[category] ?? 'autonomous';
  }

  async setCategoryLevel(tenantId: string, category: AutonomyCategory, level: AutonomyLevel): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const settings = (tenant?.settings as Record<string, any>) || {};
    const categories = { ...(settings.mikeyAutonomyCategories || {}), [category]: level };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { settings: { ...settings, mikeyAutonomyCategories: categories } } });
  }

  async getAllCategoryLevels(tenantId: string): Promise<Record<AutonomyCategory, AutonomyLevel>> {
    const settings = await this.getTenantSettings(tenantId);
    const stored = settings.mikeyAutonomyCategories || {};
    return Object.fromEntries(AUTONOMY_CATEGORIES.map((c) => [c, stored[c] ?? 'autonomous'])) as Record<AutonomyCategory, AutonomyLevel>;
  }

  async isQuietHours(tenantId: string): Promise<boolean> {
    const settings = await this.getTenantSettings(tenantId);
    const start = settings.autonomyQuietHoursStart ?? DEFAULT_QUIET_HOURS_START;
    const end = settings.autonomyQuietHoursEnd ?? DEFAULT_QUIET_HOURS_END;
    const hour = new Date().getHours();
    if (start === end) return false; // quiet hours disabled
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end; // wraps past midnight
  }

  async isUnderDailyCap(tenantId: string): Promise<boolean> {
    const settings = await this.getTenantSettings(tenantId);
    const cap = settings.autonomyDailyCap ?? DEFAULT_DAILY_CAP;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await this.prisma.mikeyAutonomousAction.count({
      where: { tenantId, createdAt: { gte: todayStart } },
    });
    return count < cap;
  }

  async isLeadOffCooldown(tenantId: string, leadId: string): Promise<boolean> {
    const settings = await this.getTenantSettings(tenantId);
    const cooldownHours = settings.autonomyLeadCooldownHours ?? DEFAULT_LEAD_COOLDOWN_HOURS;
    const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);
    const recent = await this.prisma.mikeyAutonomousAction.findFirst({
      where: { tenantId, leadId, createdAt: { gte: since } },
    });
    return !recent;
  }

  /** All internal (non-messaging) checks: category dial, then daily cap — quiet hours and per-lead cooldown are message-specific. */
  async canActInternally(tenantId: string, category: AutonomyCategory): Promise<{ allowed: boolean; reason?: string }> {
    const level = await this.getCategoryLevel(tenantId, category);
    if (level === 'off') return { allowed: false, reason: `${category} autonomy is turned off` };
    if (level === 'observe') return { allowed: false, reason: `${category} is in observe-only mode` };
    if (!(await this.isUnderDailyCap(tenantId))) return { allowed: false, reason: 'daily autonomous action cap reached' };
    return { allowed: true };
  }

  /** Full check for any autonomous action that messages a specific lead. */
  async canMessageLeadAutonomously(tenantId: string, category: AutonomyCategory, leadId: string): Promise<{ allowed: boolean; reason?: string }> {
    const level = await this.getCategoryLevel(tenantId, category);
    if (level === 'off') return { allowed: false, reason: `${category} autonomy is turned off` };
    if (level === 'observe') return { allowed: false, reason: `${category} is in observe-only mode` };
    if (await this.isQuietHours(tenantId)) return { allowed: false, reason: 'quiet hours' };
    if (!(await this.isUnderDailyCap(tenantId))) return { allowed: false, reason: 'daily autonomous action cap reached' };
    if (!(await this.isLeadOffCooldown(tenantId, leadId))) return { allowed: false, reason: 'lead was already actioned autonomously within the cooldown window' };
    return { allowed: true };
  }
}
