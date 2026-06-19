import { Module } from '@nestjs/common';
import { ConfigLoaderService } from './config-loader.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, SharedModule],
  providers: [ConfigLoaderService],
  exports: [ConfigLoaderService],
})
export class BootstrapModule {}
