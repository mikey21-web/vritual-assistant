import { Module } from '@nestjs/common';
import { ClientFinanceService } from './client-finance.service';
import { ClientFinanceController } from './client-finance.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { WhatsAppCloudAdapter } from '../shared/adapters/messaging.adapter';

@Module({
  controllers: [ClientFinanceController],
  providers: [ClientFinanceService, InvoicePdfService, EmailAdapter, WhatsAppCloudAdapter],
  exports: [ClientFinanceService],
})
export class ClientFinanceModule {}
