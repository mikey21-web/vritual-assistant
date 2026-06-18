import { Injectable } from '@nestjs/common';

export interface CrmAdapter {
  pushLead(lead: any, mapping: any): Promise<{ success: boolean; externalId?: string; error?: string }>;
  healthCheck(config: any): Promise<boolean>;
}

@Injectable()
export class HubspotAdapter implements CrmAdapter {
  async pushLead(lead: any, mapping: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const apiKey = mapping.config?.apiKey || process.env.HUBSPOT_API_KEY;
    if (!apiKey) return { success: false, error: 'HUBSPOT_API_KEY not configured' };
    try {
      const fields: any = {};
      for (const [from, to] of Object.entries(mapping.fieldMappings || {})) {
        fields[to as string] = lead[from as string] ?? lead.contact?.[from as string];
      }
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ properties: fields }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json.message };
      return { success: true, externalId: json.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  async healthCheck(config: any): Promise<boolean> {
    const apiKey = config?.apiKey || process.env.HUBSPOT_API_KEY;
    if (!apiKey) return false;
    try {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', { headers: { Authorization: `Bearer ${apiKey}` } });
      return res.ok;
    } catch { return false; }
  }
}

@Injectable()
export class SalesforceAdapter implements CrmAdapter {
  async pushLead(lead: any, mapping: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const clientId = mapping.config?.clientId || process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = mapping.config?.clientSecret || process.env.SALESFORCE_CLIENT_SECRET;
    const username = mapping.config?.username || process.env.SALESFORCE_USERNAME;
    const password = mapping.config?.password || process.env.SALESFORCE_PASSWORD;
    const instanceUrl = mapping.config?.instanceUrl || process.env.SALESFORCE_INSTANCE_URL;

    if (!clientId || !clientSecret || !username || !password) {
      return { success: false, error: 'Salesforce credentials not configured (clientId, clientSecret, username, password required)' };
    }

    try {
      const tokenRes = await fetch(`${instanceUrl || 'https://login.salesforce.com'}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return { success: false, error: tokenJson.error_description || 'Salesforce auth failed' };

      const fields: Record<string, unknown> = {};
      for (const [from, to] of Object.entries(mapping.fieldMappings || {})) {
        fields[to as string] = lead[from as string] ?? lead.contact?.[from as string];
      }

      const res = await fetch(`${tokenJson.instance_url}/services/data/v58.0/sobjects/Lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenJson.access_token}` },
        body: JSON.stringify(fields),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json[0]?.message || 'Salesforce push failed' };
      return { success: true, externalId: json.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async healthCheck(config: any): Promise<boolean> {
    const clientId = config?.clientId || process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = config?.clientSecret || process.env.SALESFORCE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return false;
    try {
      const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      });
      return res.ok;
    } catch { return false; }
  }
}

@Injectable()
export class ZohoAdapter implements CrmAdapter {
  async pushLead(lead: any, mapping: any): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const refreshToken = mapping.config?.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    const clientId = mapping.config?.clientId || process.env.ZOHO_CLIENT_ID;
    const clientSecret = mapping.config?.clientSecret || process.env.ZOHO_CLIENT_SECRET;
    const orgId = mapping.config?.orgId || process.env.ZOHO_ORG_ID;

    if (!refreshToken || !clientId || !clientSecret) {
      return { success: false, error: 'Zoho credentials not configured (refreshToken, clientId, clientSecret required)' };
    }

    try {
      const tokenRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) return { success: false, error: tokenJson.error_description || tokenJson.error || 'Zoho auth failed' };

      const fields: Record<string, unknown> = {};
      for (const [from, to] of Object.entries(mapping.fieldMappings || {})) {
        fields[to as string] = lead[from as string] ?? lead.contact?.[from as string];
      }
      const data = [{ ...fields, Owner: fields.Owner || (orgId || '') }];

      const res = await fetch(`https://www.zohoapis.com/crm/v2/Leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Zoho-oauthtoken ${tokenJson.access_token}` },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok) return { success: false, error: json?.message || 'Zoho HTTP request failed' };
      if (json.data?.[0]?.code === 'SUCCESS') {
        return { success: true, externalId: json.data[0]?.details?.id };
      }
      return { success: false, error: json.data?.[0]?.message || 'Zoho push failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async healthCheck(config: any): Promise<boolean> {
    const refreshToken = config?.refreshToken || process.env.ZOHO_REFRESH_TOKEN;
    if (!refreshToken) return false;
    try {
      const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: 'check', client_secret: 'check' }),
      });
      return res.ok || res.status === 400;
    } catch { return false; }
  }
}
