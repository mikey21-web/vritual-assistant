import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * A distinct passport strategy (name: partner-jwt) from the internal
 * JwtStrategy — a partner's token payload identifies a PartnerPortalUser,
 * never a User, so it can never be accepted by internal-staff-only routes
 * even if it reused the same signing secret (spec 48.12: separate auth
 * scope from internal users).
 */
@Injectable()
export class PartnerJwtStrategy extends PassportStrategy(Strategy, 'partner-jwt') {
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

  async validate(payload: { sub: string; scope: string; tenantId: string; channelPartnerId: string }) {
    if (payload.scope !== 'partner') throw new UnauthorizedException('Invalid token scope');
    const partnerUser = await this.prisma.partnerPortalUser.findUnique({ where: { id: payload.sub } });
    if (!partnerUser || !partnerUser.active) throw new UnauthorizedException('Partner account is inactive or not found');

    return {
      sub: partnerUser.id,
      scope: 'partner' as const,
      tenantId: partnerUser.tenantId,
      channelPartnerId: partnerUser.channelPartnerId,
      email: partnerUser.email,
    };
  }
}
