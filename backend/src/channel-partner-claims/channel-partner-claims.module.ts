import { Module } from '@nestjs/common';
import { ChannelPartnerClaimsService } from './channel-partner-claims.service';
import { ChannelPartnerClaimsController } from './channel-partner-claims.controller';

@Module({
  controllers: [ChannelPartnerClaimsController],
  providers: [ChannelPartnerClaimsService],
  exports: [ChannelPartnerClaimsService],
})
export class ChannelPartnerClaimsModule {}
