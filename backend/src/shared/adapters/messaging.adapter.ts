import { Injectable } from '@nestjs/common';

const HTTP_TIMEOUT_MS = parseInt(process.env.MESSAGING_HTTP_TIMEOUT || process.env.WHATSAPP_HTTP_TIMEOUT || '10000', 10);

async function fetchWithTimeout(url: string, init: any = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export interface MessagingAdapter {
  sendMessage(to: string, text: string, config: any): Promise<{ success: boolean; messageId?: string; error?: string }>;
  healthCheck(config: any): Promise<boolean>;
}

@Injectable()
export class WhatsAppCloudAdapter implements MessagingAdapter {
  async sendMessage(to: string, text: string, config: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = config?.phoneNumberId;
    const token = config?.accessToken;
    if (!phoneNumberId || !token) return { success: false, error: 'WhatsApp credentials not configured' };
    try {
      const res = await fetchWithTimeout(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error?.message };
      return { success: true, messageId: json.messages?.[0]?.id };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async healthCheck(config: any): Promise<boolean> {
    const token = config?.accessToken;
    const phoneNumberId = config?.phoneNumberId;
    if (!token || !phoneNumberId) return false;
    try {
      const res = await fetchWithTimeout(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages?access_token=${token}`, {
        method: 'GET',
      });
      return res.ok;
    } catch { return false; }
  }
}

@Injectable()
export class TelegramBotAdapter implements MessagingAdapter {
  async sendMessage(to: string, text: string, config?: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { success: false, error: 'Telegram bot token not configured' };
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: to, text, parse_mode: 'Markdown' }),
      });
      if (!res.ok) return { success: false, error: `Telegram API error: ${res.status}` };
      const json = await res.json();
      return { success: true, messageId: json?.result?.message_id?.toString() };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  async healthCheck(config?: any): Promise<boolean> {
    const token = config?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/getMe`);
      return res.ok;
    } catch { return false; }
  }
}
