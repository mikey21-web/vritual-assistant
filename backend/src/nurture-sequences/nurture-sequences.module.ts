import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NurtureSequencesService } from './nurture-sequences.service';
import { NurtureSequencesController } from './nurture-sequences.controller';
import { NurtureProcessorService } from './nurture-processor.service';
import { NurtureSchedulerService } from './nurture-scheduler.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { LeadsModule } from '../leads/leads.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'nurture' },
    ),
    ConversationsModule,
    LeadsModule,
    TasksModule,
  ],
  controllers: [NurtureSequencesController],
  providers: [
    NurtureSequencesService,
    NurtureProcessorService,
    NurtureSchedulerService,
  ],
  exports: [
    NurtureSequencesService,
    NurtureProcessorService,
  ],
})
export class NurtureSequencesModule {}
