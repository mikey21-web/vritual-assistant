import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/** Distinct strategy (name: buyer-jwt) — a buyer session is scoped to exactly one booking and never touches internal routes. */
@Injectable()
export class BuyerJwtStrategy extends PassportStrategy(Strategy, 'buyer-jwt') {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { scope: string; tenantId: string; bookingId: string; contactId?: string; leadId: string }) {
    if (payload.scope !== 'buyer') throw new UnauthorizedException('Invalid token scope');
    const booking = await this.prisma.booking.findFirst({ where: { id: payload.bookingId, tenantId: payload.tenantId } });
    if (!booking) throw new UnauthorizedException('Booking not found');

    return {
      scope: 'buyer' as const,
      tenantId: payload.tenantId,
      bookingId: payload.bookingId,
      leadId: payload.leadId,
      contactId: payload.contactId,
    };
  }
}
