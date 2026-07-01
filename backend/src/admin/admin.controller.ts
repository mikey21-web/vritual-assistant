import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OutboxService } from '../shared/outbox.service';
import { DataPruningService } from '../automation/data-pruning.service';
import { FailuresService } from '../failures/failures.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private outbox: OutboxService,
    private pruning: DataPruningService,
    private failures: FailuresService,
  ) {}

  @Post('drain')
  @Roles('OWNER', 'ADMIN')
  async drainOutbox() {
    const processed = await this.outbox.drain(50);
    return { message: `Drained ${processed} outbox messages.` };
  }

  @Post('prune')
  @Roles('OWNER', 'ADMIN')
  async prune() {
    const results = await this.pruning.pruneAll();
    return { message: `Pruned ${Object.values(results).reduce((a, b) => a + b, 0)} records.`, results };
  }

  @Post('failure/:id/retry')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  async retryFailure(@Param('id') id: string) {
    return this.failures.retry(id);
  }

  @Post('failure/:id/resolve')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  async resolveFailure(@Param('id') id: string) {
    return this.failures.resolve(id);
  }
}
