import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

/**
 * DocuSign eSignature REST API (v2.1) via JWT Grant. Requires these env vars
 * to actually send envelopes — without them, `send()` throws rather than
 * faking a signature request:
 *   DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID,
 *   DOCUSIGN_PRIVATE_KEY (PEM), DOCUSIGN_AUTH_BASE_URL, DOCUSIGN_API_BASE_URL
 * Consent: the impersonated user (DOCUSIGN_USER_ID) must have granted this
 * integration key JWT consent once via DocuSign's OAuth consent URL.
 */
@Injectable()
export class DocuSignAdapter {
  private readonly logger = new Logger(DocuSignAdapter.name);

  constructor(private config: ConfigService, private http: HttpService) {}

  private isConfigured(): boolean {
    return !!(
      this.config.get('DOCUSIGN_INTEGRATION_KEY') &&
      this.config.get('DOCUSIGN_USER_ID') &&
      this.config.get('DOCUSIGN_ACCOUNT_ID') &&
      this.config.get('DOCUSIGN_PRIVATE_KEY')
    );
  }

  private async getAccessToken(): Promise<string> {
    const integrationKey = this.config.get<string>('DOCUSIGN_INTEGRATION_KEY')!;
    const userId = this.config.get<string>('DOCUSIGN_USER_ID')!;
    const privateKey = this.config.get<string>('DOCUSIGN_PRIVATE_KEY')!.replace(/\\n/g, '\n');
    const authBaseUrl = this.config.get<string>('DOCUSIGN_AUTH_BASE_URL') || 'https://account-d.docusign.com';
    const authHost = new URL(authBaseUrl).host;

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = { iss: integrationKey, sub: userId, aud: authHost, iat: now, exp: now + 3600, scope: 'signature impersonation' };
    const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const unsigned = `${encode(header)}.${encode(payload)}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
    const jwt = `${unsigned}.${signature}`;

    const res = await firstValueFrom(this.http.post(`${authBaseUrl}/oauth/token`, new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
    return res.data.access_token;
  }

  /** Sends the document (fetched from documentUrl) for signature. Returns the DocuSign envelopeId. */
  async send(params: { documentUrl: string; documentName: string; signerName: string; signerEmail: string }): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('DocuSign is not configured (missing DOCUSIGN_INTEGRATION_KEY/USER_ID/ACCOUNT_ID/PRIVATE_KEY env vars)');
    }
    const accountId = this.config.get<string>('DOCUSIGN_ACCOUNT_ID')!;
    const apiBaseUrl = this.config.get<string>('DOCUSIGN_API_BASE_URL') || 'https://demo.docusign.net/restapi';
    const accessToken = await this.getAccessToken();

    const docRes = await firstValueFrom(this.http.get(params.documentUrl, { responseType: 'arraybuffer' }));
    const documentBase64 = Buffer.from(docRes.data).toString('base64');

    const envelopeDefinition = {
      emailSubject: `Please sign: ${params.documentName}`,
      documents: [{ documentBase64, name: params.documentName, fileExtension: 'pdf', documentId: '1' }],
      recipients: {
        signers: [{
          email: params.signerEmail,
          name: params.signerName,
          recipientId: '1',
          routingOrder: '1',
          tabs: { signHereTabs: [{ anchorString: '/sig/', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' }] },
        }],
      },
      status: 'sent',
    };

    const res = await firstValueFrom(this.http.post(
      `${apiBaseUrl}/v2.1/accounts/${accountId}/envelopes`,
      envelopeDefinition,
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    ));
    return res.data.envelopeId;
  }

  /** Maps a DocuSign Connect envelope status string to our internal ESignStatus. */
  mapStatus(docuSignStatus: string): 'SIGNED' | 'REJECTED' | null {
    if (docuSignStatus === 'completed') return 'SIGNED';
    if (docuSignStatus === 'declined' || docuSignStatus === 'voided') return 'REJECTED';
    return null;
  }
}
