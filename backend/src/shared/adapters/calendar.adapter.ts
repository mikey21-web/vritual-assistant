import { Injectable } from '@nestjs/common';

export interface CalendarAdapter {
  createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }>;
  healthCheck(config: any): Promise<boolean>;
  // Best-effort next-available-slots lookup. Providers that manage their own
  // availability page (e.g. Calendly) may return a note instead of slots.
  getAvailability(config: any): Promise<{ slots?: string[]; note?: string; error?: string }>;
  // Best-effort cancel of a previously created booking. `booking` is the
  // stored Booking row (has externalEventId when we captured one).
  cancelEvent(config: any, booking: any): Promise<{ ok: boolean; error?: string }>;
  // Best-effort move of a booking to a new ISO datetime. May fall back to
  // issuing a fresh scheduling link when the provider doesn't expose a
  // direct reschedule API for bookings we didn't capture an event id for.
  rescheduleEvent(config: any, booking: any, newTimeIso: string): Promise<{ ok: boolean; link?: string; scheduledAt?: string; error?: string }>;
}

@Injectable()
export class CalendlyAdapter implements CalendarAdapter {
  async createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }> {
    const token = settings?.config?.apiKey;
    if (!token) return { error: 'CALENDLY_API_KEY not configured' };

    const eventTypeUuid = settings?.config?.eventTypeUuid;
    if (!eventTypeUuid) return { error: 'Calendly eventTypeUuid not configured' };

    try {
      const res = await fetch('https://api.calendly.com/scheduling_links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ max_event_count: 1, owner_type: 'EventType', owner: `https://api.calendly.com/event_types/${eventTypeUuid}` }),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.message || 'Calendly booking link creation failed' };

      let link = json.resource?.booking_url;
      // Prefill lead data if available
      if (link && lead?.contact) {
        try {
          const url = new URL(link);
          if (lead.contact.name) url.searchParams.set('name', lead.contact.name);
          if (lead.contact.email) url.searchParams.set('email', lead.contact.email);
          if (lead.contact.phone) url.searchParams.set('a1', lead.contact.phone); // Calendly custom question
          link = url.toString();
        } catch {}
      }
      return { link };
    } catch (e: any) { return { error: e.message }; }
  }

  async healthCheck(config: any): Promise<boolean> {
    const token = config?.apiKey;
    if (!token) return false;
    try {
      const res = await fetch('https://api.calendly.com/users/me', { headers: { Authorization: `Bearer ${token}` } });
      return res.ok;
    } catch { return false; }
  }

  async getAvailability(config: any): Promise<{ slots?: string[]; note?: string; error?: string }> {
    const token = config?.apiKey;
    const eventTypeUuid = config?.eventTypeUuid;
    if (!token || !eventTypeUuid) return { error: 'Calendly not configured' };

    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(); // Calendly caps ranges at ~7 days
      const url = new URL('https://api.calendly.com/event_type_available_times');
      url.searchParams.set('event_type', `https://api.calendly.com/event_types/${eventTypeUuid}`);
      url.searchParams.set('start_time', startTime);
      url.searchParams.set('end_time', endTime);
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) {
        // Calendly self-serves availability on the booking page; a link is still useful context.
        return { note: 'Availability is managed by the lead directly on the Calendly booking page.' };
      }
      const slots = (json.collection || []).slice(0, 5).map((s: any) => s.start_time);
      return { slots };
    } catch (e: any) { return { error: e.message }; }
  }

  async cancelEvent(config: any, booking: any): Promise<{ ok: boolean; error?: string }> {
    const token = config?.apiKey;
    if (!token) return { ok: false, error: 'CALENDLY_API_KEY not configured' };

    // We only have a real invitee UUID to cancel if a Calendly webhook previously
    // recorded one. Without it, the booking still exists on Calendly's side and
    // must be cancelled by the lead from their confirmation email.
    const inviteeUuid = booking?.externalEventId;
    if (!inviteeUuid) {
      return { ok: false, error: 'No linked Calendly invitee on file — ask the lead to cancel via their confirmation email, or track it manually.' };
    }

    try {
      const res = await fetch(`https://api.calendly.com/invitees/${inviteeUuid}/cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: booking?.metadata?.cancelReason || 'Cancelled by assistant' }),
      });
      if (!res.ok) { const json = await res.json().catch(() => ({})); return { ok: false, error: json.message || 'Calendly cancellation failed' }; }
      return { ok: true };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }

  async rescheduleEvent(config: any, booking: any, _newTimeIso: string): Promise<{ ok: boolean; link?: string; scheduledAt?: string; error?: string }> {
    // Calendly reschedules happen on Calendly's own page, not via a direct-set-time API.
    // The practical move is to issue a fresh scheduling link for the lead to pick a new time.
    const result = await this.createBookingLink({ config }, booking?.lead);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, link: result.link };
  }
}

@Injectable()
export class GoogleCalendarAdapter implements CalendarAdapter {
  async createBookingLink(settings: any, lead: any): Promise<{ link?: string; error?: string }> {
    const clientEmail = settings?.config?.clientEmail;
    const privateKey = settings?.config?.privateKey;
    const calendarId = settings?.config?.calendarId || 'primary';

    if (!clientEmail || !privateKey) return { error: 'Google Calendar creds not configured' };

    try {
      const jwt = this.createJwt(clientEmail, privateKey);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
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
        conferenceData: { createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      };

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJson.access_token}` },
        body: JSON.stringify(event),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.error?.message || 'Google Calendar event creation failed' };
      return { link: json.hangoutLink || json.htmlLink };
    } catch (e: any) { return { error: e.message }; }
  }

  async healthCheck(config: any): Promise<boolean> {
    const clientEmail = config?.clientEmail;
    const privateKey = config?.privateKey;
    if (!clientEmail || !privateKey) return false;
    try {
      const jwt = this.createJwt(clientEmail, privateKey);
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
      });
      return res.ok;
    } catch { return false; }
  }

  async getAvailability(config: any): Promise<{ slots?: string[]; note?: string; error?: string }> {
    const calendarId = config?.calendarId || 'primary';
    const token = await this.getAccessToken(config);
    if (!token) return { error: 'Google Calendar creds not configured or auth failed' };

    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
      });
      const json = await res.json();
      if (!res.ok) return { error: json.error?.message || 'Google freeBusy lookup failed' };

      const busy: { start: string; end: string }[] = json.calendars?.[calendarId]?.busy || [];
      const slots: string[] = [];
      // Walk business hours (9am-5pm UTC) day by day, skipping anything that overlaps a busy block.
      for (let day = 0; day < 5 && slots.length < 5; day++) {
        const base = new Date(timeMin);
        base.setUTCDate(base.getUTCDate() + day);
        for (let hour = 9; hour < 17 && slots.length < 5; hour++) {
          const slotStart = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, 0, 0));
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          if (slotStart < new Date()) continue;
          const overlaps = busy.some((b) => slotStart < new Date(b.end) && slotEnd > new Date(b.start));
          if (!overlaps) slots.push(slotStart.toISOString());
        }
      }
      return { slots };
    } catch (e: any) { return { error: e.message }; }
  }

  async cancelEvent(config: any, booking: any): Promise<{ ok: boolean; error?: string }> {
    const calendarId = config?.calendarId || 'primary';
    const eventId = booking?.externalEventId;
    if (!eventId) return { ok: false, error: 'No linked Google Calendar event on file for this booking' };

    const token = await this.getAccessToken(config);
    if (!token) return { ok: false, error: 'Google Calendar creds not configured or auth failed' };

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 410) { const json = await res.json().catch(() => ({})); return { ok: false, error: json.error?.message || 'Google Calendar event deletion failed' }; }
      return { ok: true };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }

  async rescheduleEvent(config: any, booking: any, newTimeIso: string): Promise<{ ok: boolean; link?: string; scheduledAt?: string; error?: string }> {
    const calendarId = config?.calendarId || 'primary';
    const eventId = booking?.externalEventId;
    const token = await this.getAccessToken(config);
    if (!token) return { ok: false, error: 'Google Calendar creds not configured or auth failed' };

    const start = new Date(newTimeIso);
    if (isNaN(start.getTime())) return { ok: false, error: 'Invalid reschedule time' };
    const end = new Date(start.getTime() + 3600000);

    if (!eventId) {
      // No captured event to move — create a fresh one at the requested time.
      return this.createEventAt(config, token, calendarId, booking, start, end);
    }

    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ start: { dateTime: start.toISOString(), timeZone: 'UTC' }, end: { dateTime: end.toISOString(), timeZone: 'UTC' } }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error?.message || 'Google Calendar reschedule failed' };
      return { ok: true, link: json.hangoutLink || json.htmlLink, scheduledAt: start.toISOString() };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }

  private async createEventAt(config: any, token: string, calendarId: string, booking: any, start: Date, end: Date): Promise<{ ok: boolean; link?: string; scheduledAt?: string; error?: string }> {
    try {
      const event = {
        summary: config?.eventTitle || `Meeting with ${booking?.lead?.contact?.name || 'Lead'}`,
        start: { dateTime: start.toISOString(), timeZone: 'UTC' },
        end: { dateTime: end.toISOString(), timeZone: 'UTC' },
        conferenceData: { createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      };
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(event),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error?.message || 'Google Calendar event creation failed' };
      return { ok: true, link: json.hangoutLink || json.htmlLink, scheduledAt: start.toISOString() };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }

  private async getAccessToken(config: any): Promise<string | null> {
    const clientEmail = config?.clientEmail;
    const privateKey = config?.privateKey;
    if (!clientEmail || !privateKey) return null;
    try {
      const jwt = this.createJwt(clientEmail, privateKey);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return null;
      return tokenJson.access_token || null;
    } catch { return null; }
  }

  private createJwt(clientEmail: string, privateKey: string): string {
    // Handle escaped newlines (common when stored in JSON or .env)
    const normalizedKey = privateKey.replace(/\\n/g, '\n');
    if (!normalizedKey.includes('BEGIN PRIVATE KEY') && !normalizedKey.includes('BEGIN RSA PRIVATE KEY')) {
      throw new Error('Invalid Google Calendar private key — must be a PKCS8 RSA private key');
    }
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const claims = Buffer.from(JSON.stringify({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/calendar', aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now })).toString('base64url');
    const sign = (str: string, key: string): string => {
      const crypto = require('crypto');
      return crypto.createSign('RSA-SHA256').update(str).sign(key, 'base64url');
    };
    const unsigned = `${header}.${claims}`;
    return `${unsigned}.${sign(unsigned, normalizedKey)}`;
  }
}
