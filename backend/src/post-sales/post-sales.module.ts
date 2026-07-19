import { Module } from '@nestjs/common';
import { PostSalesService } from './post-sales.service';
import { PostSalesController } from './post-sales.controller';
import { PostSalesCasesService } from './post-sales-cases.service';
import { PostSalesCasesController } from './post-sales-cases.controller';
import { PossessionService } from './possession.service';
import { PossessionController } from './possession.controller';

@Module({
  controllers: [PostSalesController, PostSalesCasesController, PossessionController],
  providers: [PostSalesService, PostSalesCasesService, PossessionService],
  exports: [PostSalesService, PostSalesCasesService, PossessionService],
})
export class PostSalesModule {}
