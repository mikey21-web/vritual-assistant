import { Module } from '@nestjs/common';
import { NurtureSequencesService } from './nurture-sequences.service';
import { NurtureSequencesController } from './nurture-sequences.controller';

@Module({
  controllers: [NurtureSequencesController],
  providers: [NurtureSequencesService],
  exports: [NurtureSequencesService],
})
export class NurtureSequencesModule {}
