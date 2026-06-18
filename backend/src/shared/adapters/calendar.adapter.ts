import { Injectable } from '@nestjs/common';

export interface CalendarAdapter {
  createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }>;
  healthCheck(config: any): Promise<boolean>;
}

@Injectable()
export class CalendlyAdapter implements CalendarAdapter {
  async createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }> {
    const token = settings?.config?.apiKey || process.env.CALENDLY_API_KEY;
    if (!token) return { error: 'CALENDLY_API_KEY not configured' };

    const eventTypeUuid = settings?.config?.eventTypeUuid;
    if (!eventTypeUuid) return { error: 'Calendly eventTypeUuid not configured in booking settings' };

    try {
      const res = await fetch('https://api.calendly.com/scheduling_links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          max_event_count: 1,
          owner_type: 'EventType',
          owner: `https://api.calendly.com/event_types/${eventTypeUuid}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.message || 'Calendly booking link creation failed' };
      return { link: json.resource?.booking_url };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async healthCheck(config: any): Promise<boolean> {
    const token = config?.apiKey || process.env.CALENDLY_API_KEY;
    if (!token) return false;
    try {
      const res = await fetch('https://api.calendly.com/users/me', { headers: { Authorization: `Bearer ${token}` } });
      return res.ok;
    } catch { return false; }
  }
}

@Injectable()
export class GoogleCalendarAdapter implements CalendarAdapter {
  async createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }> {
    const clientEmail = settings?.config?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = settings?.config?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const calendarId = settings?.config?.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary';

    if (!clientEmail || !privateKey) {
      return { error: 'Google Calendar service account not configured (clientEmail, privateKey required)' };
    }

    try {
      const jwt = this.createJwt(clientEmail, privateKey);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return { error: tokenJson.error_description || 'Google auth failed' };

      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();
      const event = {
        summary: settings?.config?.eventTitle || `Meeting with ${lead?.contact?.name || 'Lead'}`,
        description: `Lead: ${lead?.contact?.name || 'N/A'} — ${lead?.contact?.email || 'N/A'}`,
        start: { dateTime: startTime, timeZone: 'UTC' },
        end: { dateTime: endTime, timeZone: 'UTC' },
        conferenceData: {
          createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJson.access_token}` },
        body: JSON.stringify(event),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.error?.message || 'Google Calendar event creation failed' };
      return { link: json.hangoutLink || json.htmlLink };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async healthCheck(config: any): Promise<boolean> {
    const clientEmail = config?.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = config?.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!clientEmail || !privateKey) return false;
    try {
      const jwt = this.createJwt(clientEmail, privateKey);
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
      });
      return res.ok;
    } catch { return false; }
  }

  private createJwt(clientEmail: string, privateKey: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const claims = Buffer.from(JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })).toString('base64url');
    const sign = (str: string, key: string): string => {
      const crypto = require('crypto');
      return crypto.createSign('RSA-SHA256').update(str).sign(key, 'base64url');
    };
    const unsigned = `${header}.${claims}`;
    return `${unsigned}.${sign(unsigned, privateKey)}`;
  }
}
