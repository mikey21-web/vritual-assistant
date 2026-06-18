import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NicheTemplatesService } from './niche-templates.service';
import { NicheTemplatesController } from './niche-templates.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [NicheTemplatesController],
  providers: [NicheTemplatesService],
  exports: [NicheTemplatesService],
})
export class NicheTemplatesModule {}
