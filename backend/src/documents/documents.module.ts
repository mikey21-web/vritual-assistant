import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ESignService } from './esign.service';
import { DocuSignAdapter } from './esign-providers/docusign.adapter';
import { ZohoSignAdapter } from './esign-providers/zoho-sign.adapter';

@Module({
  imports: [HttpModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ESignService, DocuSignAdapter, ZohoSignAdapter],
  exports: [DocumentsService, ESignService, DocuSignAdapter, ZohoSignAdapter],
})
export class DocumentsModule {}
