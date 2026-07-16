import { Module } from '@nestjs/common';
import { ChannelPartnersService } from './channel-partners.service';
import { ChannelPartnersController } from './channel-partners.controller';

@Module({
  controllers: [ChannelPartnersController],
  providers: [ChannelPartnersService],
  exports: [ChannelPartnersService],
})
export class ChannelPartnersModule {}
