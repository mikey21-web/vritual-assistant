import { Module } from '@nestjs/common';
import { PublicProfileService } from './public-profile.service';
import { PublicProfileController } from './public-profile.controller';

@Module({
  controllers: [PublicProfileController],
  providers: [PublicProfileService],
  exports: [PublicProfileService],
})
export class PublicProfileModule {}
