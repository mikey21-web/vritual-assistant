import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailAdapter implements OnModuleInit {
  private readonly logger = new Logger(EmailAdapter.name);
  private transporter: any = null;

  constructor(private config: ConfigService) {}

  onModuleInit() {
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

  async send(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@example.com');

    if (!this.transporter) return { success: false, error: 'SMTP not configured' };

    try {
      await this.transporter.sendMail({ from, to, subject, html });
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
}
