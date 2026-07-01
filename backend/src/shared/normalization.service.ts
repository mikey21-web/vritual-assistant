import { Injectable } from '@nestjs/common';

/**
 * Phone and email normalization service.
 * Normalizes phone numbers to E.164 format and emails to lowercase.
 */
@Injectable()
export class NormalizationService {
  // Simple US/India phone normalization — extend for other regions
  private readonly COUNTRY_CODE: string;

  constructor() {
    this.COUNTRY_CODE = process.env.DEFAULT_COUNTRY_CODE || 'US';
  }

  normalizePhone(phone: string): string {
    if (!phone) return phone;
    // Strip all non-digit characters except leading +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // If starts with 00, replace with +
    if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
    // If just digits and no +, assume US/India
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = this.COUNTRY_CODE === 'US' ? '+1' + cleaned : '+91' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      }
    }
    return cleaned;
  }

  normalizeEmail(email: string): string {
    if (!email) return email;
    const [local, domain] = email.toLowerCase().trim().split('@');
    if (!domain) return email;
    // Remove dots from gmail addresses (gmail treats them as ignored)
    const normalizedLocal = domain === 'gmail.com' || domain === 'googlemail.com'
      ? local.replace(/\./g, '')
      : local;
    return `${normalizedLocal}@${domain}`;
  }
}
