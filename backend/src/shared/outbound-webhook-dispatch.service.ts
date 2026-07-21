import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class OutboundWebhookDispatchService {
  constructor(private prisma: PrismaService) {}

  async dispatch(eventType: string, payload: any) {
    const hooks = await this.prisma.outboundWebhook.findMany({
      where: { events: { has: eventType }, active: true },
    });
    return Promise.allSettled(hooks.map((wh) => this.send(wh, { event: eventType, data: payload })));
  }

  async send(wh: { url: string; secret?: string; id: string }, body: any) {
    const payload = JSON.stringify(body);
    const signature = wh.secret ? crypto.createHmac('sha256', wh.secret).update(payload).digest('hex') : '';
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-DeploySafe-Signature': signature, 'User-Agent': 'DeploySafe-CRM-Webhook/1.0' },
        body: payload,
      });
      return { webhookId: wh.id, status: res.ok ? 'success' : 'failed', statusCode: res.status };
    } catch (e: any) {
      return { webhookId: wh.id, status: 'error', error: e.message };
    }
  }
}
