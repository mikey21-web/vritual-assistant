import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PostHog } from 'posthog-node';

@Injectable()
export class PosthogService implements OnModuleDestroy {
  private readonly logger = new Logger(PosthogService.name);
  private client: PostHog | null = null;

  constructor() {
    const key = process.env.POSTHOG_KEY;
    const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';

    if (key && key !== 'phc_placeholder') {
      this.client = new PostHog(key, { host });
      this.logger.log('PostHog initialized');
    } else {
      this.logger.warn('PostHog key not set - analytics disabled');
    }
  }

  capture(event: string, distinctId: string, properties?: Record<string, unknown>) {
    if (!this.client) return;
    this.client.capture({ distinctId, event, properties });
  }

  identify(distinctId: string, traits?: Record<string, unknown>) {
    if (!this.client) return;
    this.client.identify({ distinctId, properties: traits });
  }

  groupIdentify(groupType: string, groupKey: string, properties?: Record<string, unknown>) {
    if (!this.client) return;
    this.client.groupIdentify({ groupType, groupKey, properties });
  }

  async isFeatureEnabled(key: string, distinctId: string, defaultValue = false): Promise<boolean> {
    if (!this.client) return defaultValue;
    const result = await this.client.isFeatureEnabled(key, distinctId);
    return result ?? defaultValue;
  }

  async getAllFlags(distinctId: string): Promise<Record<string, boolean | string>> {
    if (!this.client) return {};
    return this.client.getAllFlags(distinctId);
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
