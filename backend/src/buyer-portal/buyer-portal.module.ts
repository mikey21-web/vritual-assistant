import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { BuyerAuthService } from './buyer-auth.service';
import { BuyerJwtStrategy } from './buyer-jwt.strategy';
import { BuyerPortalService } from './buyer-portal.service';
import { BuyerPortalController } from './buyer-portal.controller';
import { KycModule } from '../kyc/kyc.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConstructionErpModule } from '../construction-erp/construction-erp.module';

@Module({
  imports: [PassportModule, KycModule, TicketsModule, ConstructionErpModule],
  controllers: [BuyerPortalController],
  providers: [BuyerAuthService, BuyerJwtStrategy, BuyerPortalService],
  exports: [BuyerAuthService, BuyerPortalService],
})
export class BuyerPortalModule {}
