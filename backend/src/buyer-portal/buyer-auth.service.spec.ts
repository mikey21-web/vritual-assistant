import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BuyerAuthService } from './buyer-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { UnauthorizedException } from '@nestjs/common';

describe('BuyerAuthService', () => {
  let service: BuyerAuthService;
  let prisma: any;

  const booking = { id: 'booking-1', tenantId: 't1', bookingNumber: 'BK-2026-ABC123', leadId: 'lead-1', lead: { contact: { id: 'contact-1', email: 'buyer@example.com', phone: '9876543210' } } };

  beforeEach(async () => {
    prisma = {
      booking: { findUnique: jest.fn().mockResolvedValue(booking) },
      buyerPortalToken: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
        { provide: EmailAdapter, useValue: { send: jest.fn().mockResolvedValue({ success: true }) } },
      ],
    }).compile();

    service = module.get(BuyerAuthService);
  });

  it('sends a link and creates a token when the contact hint matches', async () => {
    await service.requestMagicLink('BK-2026-ABC123', 'buyer@example.com');
    expect(prisma.buyerPortalToken.create).toHaveBeenCalled();
  });

  it('returns the same generic message when the booking does not exist (no enumeration)', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    const result = await service.requestMagicLink('BK-NOPE', 'buyer@example.com');
    expect(result.message).toContain('If those details match');
    expect(prisma.buyerPortalToken.create).not.toHaveBeenCalled();
  });

  it('returns the same generic message when the contact hint does not match (no enumeration)', async () => {
    const result = await service.requestMagicLink('BK-2026-ABC123', 'wrong@example.com');
    expect(result.message).toContain('If those details match');
    expect(prisma.buyerPortalToken.create).not.toHaveBeenCalled();
  });

  it('rejects verification of an unknown/expired/used token', async () => {
    prisma.buyerPortalToken.findFirst.mockResolvedValue(null);
    await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(UnauthorizedException);
  });

  it('issues a buyer-scoped token and marks the link used on successful verification', async () => {
    prisma.buyerPortalToken.findFirst.mockResolvedValue({ id: 'tok-1', tenantId: 't1', bookingId: 'booking-1', contactId: 'contact-1', booking: { leadId: 'lead-1' } });
    const result = await service.verifyMagicLink('good-token');
    expect(result.accessToken).toBe('signed-token');
    expect(prisma.buyerPortalToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tok-1' }, data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
    );
  });
});
