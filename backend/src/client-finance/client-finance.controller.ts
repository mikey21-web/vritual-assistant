import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClientFinanceService } from './client-finance.service';
import {
  CreateInvoiceDto, UpdateInvoiceDto, CreateQuotationDto, UpdateQuotationDto,
  CreateContractDto, UpdateContractDto, CreateTransactionDto,
} from './dto/finance.dto';
import { PaginationDto } from '../shared/dto/pagination.dto';

const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;
const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'] as const;

@ApiTags('ClientFinance')
@Controller('client-finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientFinanceController {
  constructor(private service: ClientFinanceService) {}

  @Get('invoices') @Roles(...READ_ROLES) findInvoices(@Query() q: PaginationDto & { status?: string; contactId?: string; eventId?: string }) { return this.service.findInvoices(q); }
  @Post('invoices') @Roles(...WRITE_ROLES) createInvoice(@Body() d: CreateInvoiceDto) { return this.service.createInvoice(d); }
  @Get('invoices/:id') @Roles(...READ_ROLES) findInvoice(@Param('id') id: string) { return this.service.findInvoice(id); }
  @Patch('invoices/:id') @Roles(...WRITE_ROLES) updateInvoice(@Param('id') id: string, @Body() d: UpdateInvoiceDto) { return this.service.updateInvoice(id, d); }

  @Get('quotations') @Roles(...READ_ROLES) findQuotations(@Query() q: PaginationDto & { status?: string; contactId?: string; eventId?: string }) { return this.service.findQuotations(q); }
  @Post('quotations') @Roles(...WRITE_ROLES) createQuotation(@Body() d: CreateQuotationDto) { return this.service.createQuotation(d); }
  @Get('quotations/:id') @Roles(...READ_ROLES) findQuotation(@Param('id') id: string) { return this.service.findQuotation(id); }
  @Patch('quotations/:id') @Roles(...WRITE_ROLES) updateQuotation(@Param('id') id: string, @Body() d: UpdateQuotationDto) { return this.service.updateQuotation(id, d); }

  @Get('contracts') @Roles(...READ_ROLES) findContracts(@Query() q: PaginationDto & { status?: string }) { return this.service.findContracts(q); }
  @Post('contracts') @Roles(...WRITE_ROLES) createContract(@Body() d: CreateContractDto) { return this.service.createContract(d); }
  @Get('contracts/:id') @Roles(...READ_ROLES) findContract(@Param('id') id: string) { return this.service.findContract(id); }
  @Patch('contracts/:id') @Roles(...WRITE_ROLES) updateContract(@Param('id') id: string, @Body() d: UpdateContractDto) { return this.service.updateContract(id, d); }

  @Get('transactions') @Roles(...READ_ROLES) findTransactions(@Query() q: PaginationDto & { type?: string; status?: string; eventId?: string }) { return this.service.findTransactions(q); }
  @Post('transactions') @Roles(...WRITE_ROLES) createTransaction(@Body() d: CreateTransactionDto) { return this.service.createTransaction(d); }

  @Get('reports/tax') @Roles(...READ_ROLES) taxReport() { return this.service.getTaxReport(); }
  @Get('reports/profit-and-loss') @Roles(...READ_ROLES) profitAndLoss() { return this.service.getProfitAndLoss(); }
  @Get('reports/cash-flow') @Roles(...READ_ROLES) cashFlow() { return this.service.getCashFlow(); }
  @Get('reports/balance-sheet') @Roles(...READ_ROLES) balanceSheet() { return this.service.getBalanceSheet(); }
  @Get('reports/vendor-payments') @Roles(...READ_ROLES) vendorPayments() { return this.service.getVendorPayments(); }
  @Get('reports/event-profitability') @Roles(...READ_ROLES) eventProfitability() { return this.service.getEventProfitability(); }
}
