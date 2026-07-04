import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QuoteRequestService } from './quote-request.service';
import { CreateQuoteRequestDto, SendQuoteDto } from './dto/quote-request.dto';

@ApiTags('Quote Requests')
@Controller('quote-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuoteRequestController {
  constructor(private service: QuoteRequestService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: 'Create a new quote request for a lead' })
  create(@Body() dto: CreateQuoteRequestDto) {
    return this.service.createQuoteRequest(dto.leadId, {
      items: dto.items,
      notes: dto.notes,
    });
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT')
  @ApiOperation({ summary: 'Get quote request details' })
  @ApiParam({ name: 'id', description: 'Quote request (conversion) ID' })
  get(@Param('id') id: string) {
    return this.service.getQuoteRequest(id);
  }

  @Post(':id/generate')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Generate the quote text from a quote request' })
  @ApiParam({ name: 'id', description: 'Quote request (conversion) ID' })
  generate(@Param('id') id: string) {
    return this.service.generateQuoteQuote(id);
  }

  @Post(':id/send')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Send the generated quote to the lead via WhatsApp or Email' })
  @ApiParam({ name: 'id', description: 'Quote request (conversion) ID' })
  send(@Param('id') id: string, @Body() dto: SendQuoteDto) {
    return this.service.sendQuote(id, dto.channel);
  }
}
