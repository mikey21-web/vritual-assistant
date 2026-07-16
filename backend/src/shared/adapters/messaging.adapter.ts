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

interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  parameters?: Array<{ type: 'text' | 'image' | 'document' | 'video'; text?: string; image?: { link: string }; document?: { link: string; filename?: string }; video?: { link: string } }>;
}

@Injectable()
export class WhatsAppCloudAdapter implements MessagingAdapter {
  async sendMessage(to: string, text: string, config: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = config?.phoneNumberId || config?.WHATSAPP_PHONE_NUMBER_ID;
    const token = config?.accessToken || config?.WHATSAPP_ACCESS_TOKEN;
    const within24h = config?.within24h !== false;
    const templateId = config?.templateId;
    const templateLang = config?.templateLang || 'en';
    const templateComponents = config?.templateComponents as WhatsAppTemplateComponent[] | undefined;
    const mediaUrl = config?.mediaUrl;
    const mediaType = config?.mediaType; // 'image' | 'document' | 'video' | 'audio'
    const interactiveType = config?.interactiveType; // 'button' | 'list'
    const interactiveBody = config?.interactiveBody;
    const interactiveButtons = config?.interactiveButtons as Array<{ id: string; title: string }> | undefined;
    const interactiveSections = config?.interactiveSections as Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> | undefined;

    if (!phoneNumberId || !token) return { success: false, error: 'WhatsApp credentials not configured' };

    if (!within24h && !templateId) {
      return { success: false, error: 'Outside 24h window — a template message is required' };
    }

    try {
      let body: any;

      if (!within24h && templateId) {
        body = {
          messaging_product: 'whatsapp', to, type: 'template',
          template: { name: templateId, language: { code: templateLang } },
        };
        if (templateComponents?.length) {
          body.template.components = templateComponents;
        }
      } else if (mediaUrl && mediaType) {
        const caption = config?.caption || (mediaType !== 'audio' ? text : undefined);
        body = {
          messaging_product: 'whatsapp', to, type: mediaType,
          [mediaType]: caption ? { link: mediaUrl, caption } : { link: mediaUrl },
        };
      } else if (interactiveType === 'button' && interactiveBody && interactiveButtons) {
        body = {
          messaging_product: 'whatsapp', to, type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: interactiveBody },
            action: { buttons: interactiveButtons.map(b => ({ type: 'reply', reply: { id: b.id, title: b.title } })) },
          },
        };
      } else if (interactiveType === 'list' && interactiveBody && interactiveSections) {
        body = {
          messaging_product: 'whatsapp', to, type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: interactiveBody },
            action: { sections: interactiveSections },
          },
        };
      } else {
        body = { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } };
      }

      const res = await fetchWithTimeout(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
      return { success: true, messageId: json.messages?.[0]?.id };
    } catch (e: any) { return { success: false, error: e.message }; }
  }
  async healthCheck(config: any): Promise<boolean> {
    const token = config?.accessToken || config?.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = config?.phoneNumberId || config?.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return false;
    try {
      const res = await fetchWithTimeout(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages?access_token=${token}`, {
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
