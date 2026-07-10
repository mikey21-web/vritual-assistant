import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailAdapter implements OnModuleInit {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: any = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.initSmtp();
  }

  private initSmtp() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<string>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (host && user && pass) {
      try {
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({ host, port: parseInt(port || '587'), secure: false, auth: { user, pass } });
        this.logger.log('SMTP transporter initialized');
      } catch (e: any) {
        this.logger.error(`Failed to create SMTP transporter: ${e.message}`);
      }
    }
  }

  async send(to: string, subject: string, html: string, replyTo?: string): Promise<{ success: boolean; error?: string }> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@example.com');

    if (!this.transporter) return { success: false, error: 'SMTP not configured' };

    try {
      await this.transporter.sendMail({ from, to, subject, html, inReplyTo: replyTo, references: replyTo });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async healthCheck(): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    return !!(host && user);
  }

  async imapConfig(): Promise<{ host?: string; port?: number; user?: string; pass?: string; tls?: boolean }> {
    return {
      host: this.config.get<string>('IMAP_HOST'),
      port: parseInt(this.config.get<string>('IMAP_PORT', '993')),
      user: this.config.get<string>('IMAP_USER'),
      pass: this.config.get<string>('IMAP_PASS'),
      tls: this.config.get<string>('IMAP_TLS', 'true') !== 'false',
    };
  }

  async fetchUnseen(): Promise<any[]> {
    const cfg = await this.imapConfig();
    if (!cfg.host || !cfg.user || !cfg.pass) {
      this.logger.warn('IMAP not configured, skipping fetch');
      return [];
    }

    const { ImapFlow } = require('imapflow');
    const { simpleParser } = require('mailparser');

    const client = new ImapFlow({
      host: cfg.host,
      port: cfg.port || 993,
      secure: cfg.tls !== false,
      auth: { user: cfg.user, pass: cfg.pass },
      logger: false,
    });

    const messages: any[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const msg of client.fetch({ seen: false }, { uid: true, source: true, envelope: true })) {
          try {
            const parsed = await simpleParser(msg.source);
            const fromAddr = parsed.from?.value?.[0]?.address || '';
            const subject = parsed.subject || '(no subject)';
            const body = parsed.text || parsed.html || '';
            const messageId = parsed.messageId || `msg-${msg.uid}`;
            const inReplyTo = parsed.inReplyTo || undefined;
            messages.push({ from: fromAddr, subject, body, messageId, inReplyTo, uid: msg.uid, receivedDate: parsed.date || new Date() });
          } catch (parseErr: any) {
            this.logger.warn(`Failed to parse message UID ${msg.uid}: ${parseErr.message}`);
          }
        }
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`IMAP fetch failed: ${err.message}`);
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }

    return messages;
  }

  async markSeen(uid: number): Promise<void> {
    const cfg = await this.imapConfig();
    if (!cfg.host || !cfg.user || !cfg.pass) return;

    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
      host: cfg.host,
      port: cfg.port || 993,
      secure: cfg.tls !== false,
      auth: { user: cfg.user, pass: cfg.pass },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        await client.messageFlagsAdd({ uid }, ['\\Seen']);
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`Failed to mark message ${uid} as seen: ${err.message}`);
    } finally {
      try { await client.logout(); } catch { /* ignore */ }
    }
  }
}
