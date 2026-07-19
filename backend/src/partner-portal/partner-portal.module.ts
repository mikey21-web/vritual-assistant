import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerJwtStrategy } from './partner-jwt.strategy';
import { PartnerPortalService } from './partner-portal.service';
import { PartnerPortalController } from './partner-portal.controller';
import { PartnerPortalAdminController } from './partner-portal-admin.controller';
import { ChannelPartnerClaimsModule } from '../channel-partner-claims/channel-partner-claims.module';

@Module({
  imports: [PassportModule, ChannelPartnerClaimsModule],
  controllers: [PartnerPortalController, PartnerPortalAdminController],
  providers: [PartnerAuthService, PartnerJwtStrategy, PartnerPortalService],
  exports: [PartnerAuthService, PartnerPortalService],
})
export class PartnerPortalModule {}
