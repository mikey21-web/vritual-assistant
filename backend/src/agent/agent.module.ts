import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentClientService } from './agent-client.service';

@Module({
  imports: [HttpModule],
  controllers: [AgentController],
  providers: [AgentService, AgentClientService],
  exports: [AgentService, AgentClientService],
})
export class AgentModule {}
