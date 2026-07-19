import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Zoho Sign REST API (v1) via OAuth refresh-token grant. Requires these env
 * vars to actually send requests — without them, `send()` throws rather than
 * faking a signature request:
 *   ZOHO_SIGN_CLIENT_ID, ZOHO_SIGN_CLIENT_SECRET, ZOHO_SIGN_REFRESH_TOKEN,
 *   ZOHO_SIGN_DC (data centre suffix, e.g. "in", "com", "eu")
 */
@Injectable()
export class ZohoSignAdapter {
  constructor(private config: ConfigService, private http: HttpService) {}

  private isConfigured(): boolean {
    return !!(
      this.config.get('ZOHO_SIGN_CLIENT_ID') &&
      this.config.get('ZOHO_SIGN_CLIENT_SECRET') &&
      this.config.get('ZOHO_SIGN_REFRESH_TOKEN')
    );
  }

  private dc(): string {
    return this.config.get<string>('ZOHO_SIGN_DC') || 'in';
  }

  private async getAccessToken(): Promise<string> {
    const res = await firstValueFrom(this.http.post(
      `https://accounts.zoho.${this.dc()}/oauth/v2/token`,
      new URLSearchParams({
        refresh_token: this.config.get<string>('ZOHO_SIGN_REFRESH_TOKEN')!,
        client_id: this.config.get<string>('ZOHO_SIGN_CLIENT_ID')!,
        client_secret: this.config.get<string>('ZOHO_SIGN_CLIENT_SECRET')!,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    ));
    return res.data.access_token;
  }

  /** Sends the document (fetched from documentUrl) for signature. Returns the Zoho Sign request_id. */
  async send(params: { documentUrl: string; documentName: string; signerName: string; signerEmail: string }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Zoho Sign is not configured (missing ZOHO_SIGN_CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN env vars)');
    }
    const accessToken = await this.getAccessToken();
    const docRes = await firstValueFrom(this.http.get(params.documentUrl, { responseType: 'arraybuffer' }));

    const form = new FormData();
    form.append('file', new Blob([docRes.data]), params.documentName);
    form.append('data', JSON.stringify({
      requests: {
        request_name: params.documentName,
        actions: [{
          action_type: 'SIGN',
          recipient_name: params.signerName,
          recipient_email: params.signerEmail,
          verify_recipient: false,
        }],
      },
    }));

    const res = await firstValueFrom(this.http.post(
      `https://sign.zoho.${this.dc()}/api/v1/requests`,
      form,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } },
    ));
    return res.data.requests.request_id;
  }

  /** Maps a Zoho Sign request_status string to our internal ESignStatus. */
  mapStatus(zohoStatus: string): 'SIGNED' | 'REJECTED' | null {
    if (zohoStatus === 'completed') return 'SIGNED';
    if (zohoStatus === 'declined' || zohoStatus === 'expired') return 'REJECTED';
    return null;
  }
}
