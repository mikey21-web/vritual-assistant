import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CopilotController } from './copilot.controller';
import { CopilotClientService } from './copilot-client.service';

@Module({
  imports: [HttpModule],
  controllers: [CopilotController],
  providers: [CopilotClientService],
  exports: [CopilotClientService],
})
export class CopilotModule {}
