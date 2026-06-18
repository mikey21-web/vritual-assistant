import { Injectable } from '@nestjs/common';

export interface MessagingAdapter {
  sendMessage(to: string, text: string, config: any): Promise<{ success: boolean; messageId?: string; error?: string }>;
  healthCheck(config: any): Promise<boolean>;
}

@Injectable()
export class WhatsAppCloudAdapter implements MessagingAdapter {
  async sendMessage(to: string, text: string, config: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!phoneNumberId || !token) return { success: false, error: 'WhatsApp credentials not configured' };
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error?.message };
      return { success: true, messageId: json.messages?.[0]?.id };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async healthCheck(config: any): Promise<boolean> {
    const token = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) return false;
    try { const res = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${token}`); return res.ok; }
    catch { return false; }
  }
}
