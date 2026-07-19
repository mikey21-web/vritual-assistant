import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';

const LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes — short-lived per spec 54.1

@Injectable()
export class BuyerAuthService {
  private readonly logger = new Logger(BuyerAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailAdapter: EmailAdapter,
  ) {}

  /**
   * Always returns the same generic message regardless of whether a match
   * was found (spec pattern mirrors forgotPassword) — never confirms or
   * denies that a booking number/contact combination exists.
   */
  async requestMagicLink(bookingNumber: string, contactHint: string): Promise<{ message: string }> {
    const generic = { message: 'If those details match a booking, a sign-in link has been sent.' };

    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: { lead: { include: { contact: true } } },
    });
    if (!booking) return generic;

    const contact = booking.lead?.contact;
    const hint = contactHint.trim().toLowerCase();
    const hintDigits = hint.replace(/\D/g, '');
    // A digit-only hint must be a real phone fragment (not an empty/near-empty
    // string, which would otherwise match via String.endsWith('') below).
    const matches = contact && (
      (contact.email && contact.email.toLowerCase() === hint) ||
      (contact.phone && hintDigits.length >= 7 && contact.phone.replace(/\D/g, '').endsWith(hintDigits))
    );
    if (!matches) return generic;

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.buyerPortalToken.create({
      data: {
        tenantId: booking.tenantId,
        bookingId: booking.id,
        contactId: contact?.id,
        tokenHash,
        expiresAt: new Date(Date.now() + LINK_TTL_MS),
      },
    });

    const magicUrl = `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/#/buyer-portal?token=${rawToken}`;
    if (contact?.email) {
      const result = await this.emailAdapter.send(
        contact.email,
        'Your sign-in link',
        `<p>Click <a href="${magicUrl}">here</a> to view your booking, payments, and documents. This link expires in 15 minutes and can only be used once.</p>`,
      );
      if (!result.success) this.logger.error(`Failed to send buyer portal magic link to ${contact.email}: ${result.error}`);
    } else {
      this.logger.warn(`Buyer ${booking.leadId} has no email on file — magic link could not be delivered (WhatsApp delivery not yet wired for this flow)`);
    }

    return generic;
  }

  async verifyMagicLink(rawToken: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const token = await this.prisma.buyerPortalToken.findFirst({
      where: { tokenHash, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { booking: true },
    });
    if (!token) throw new UnauthorizedException('Invalid or expired sign-in link');

    await this.prisma.buyerPortalToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

    const accessToken = this.jwt.sign({
      scope: 'buyer',
      tenantId: token.tenantId,
      bookingId: token.bookingId,
      leadId: token.booking.leadId,
      contactId: token.contactId,
    }, { expiresIn: '24h' });

    return { accessToken };
  }
}
