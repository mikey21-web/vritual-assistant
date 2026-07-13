import { Global, Module } from '@nestjs/common';
import { KhojClientService } from './khoj-client.service';
import { KhojSeedService } from './khoj-seed.service';

@Global()
@Module({
  providers: [KhojClientService, KhojSeedService],
  exports: [KhojClientService],
})
export class KhojClientModule {}
