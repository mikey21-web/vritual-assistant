import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
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

  @Get('invoices') @Roles(...READ_ROLES) findInvoices(@Req() req: any, @Query() q: PaginationDto & { status?: string; contactId?: string; eventId?: string }) { return this.service.findInvoices(req.user.tenantId, q); }
  @Post('invoices') @Roles(...WRITE_ROLES) createInvoice(@Req() req: any, @Body() d: CreateInvoiceDto) { return this.service.createInvoice(req.user.tenantId, d); }
  @Get('invoices/:id') @Roles(...READ_ROLES) findInvoice(@Req() req: any, @Param('id') id: string) { return this.service.findInvoice(req.user.tenantId, id); }
  @Patch('invoices/:id') @Roles(...WRITE_ROLES) updateInvoice(@Req() req: any, @Param('id') id: string, @Body() d: UpdateInvoiceDto) { return this.service.updateInvoice(req.user.tenantId, id, d); }

  @Get('quotations') @Roles(...READ_ROLES) findQuotations(@Req() req: any, @Query() q: PaginationDto & { status?: string; contactId?: string; eventId?: string }) { return this.service.findQuotations(req.user.tenantId, q); }
  @Post('quotations') @Roles(...WRITE_ROLES) createQuotation(@Req() req: any, @Body() d: CreateQuotationDto) { return this.service.createQuotation(req.user.tenantId, d); }
  @Get('quotations/:id') @Roles(...READ_ROLES) findQuotation(@Req() req: any, @Param('id') id: string) { return this.service.findQuotation(req.user.tenantId, id); }
  @Patch('quotations/:id') @Roles(...WRITE_ROLES) updateQuotation(@Req() req: any, @Param('id') id: string, @Body() d: UpdateQuotationDto) { return this.service.updateQuotation(req.user.tenantId, id, d); }

  @Get('contracts') @Roles(...READ_ROLES) findContracts(@Req() req: any, @Query() q: PaginationDto & { status?: string }) { return this.service.findContracts(req.user.tenantId, q); }
  @Post('contracts') @Roles(...WRITE_ROLES) createContract(@Req() req: any, @Body() d: CreateContractDto) { return this.service.createContract(req.user.tenantId, d); }
  @Get('contracts/:id') @Roles(...READ_ROLES) findContract(@Req() req: any, @Param('id') id: string) { return this.service.findContract(req.user.tenantId, id); }
  @Patch('contracts/:id') @Roles(...WRITE_ROLES) updateContract(@Req() req: any, @Param('id') id: string, @Body() d: UpdateContractDto) { return this.service.updateContract(req.user.tenantId, id, d); }

  @Get('transactions') @Roles(...READ_ROLES) findTransactions(@Req() req: any, @Query() q: PaginationDto & { type?: string; status?: string; eventId?: string }) { return this.service.findTransactions(req.user.tenantId, q); }
  @Post('transactions') @Roles(...WRITE_ROLES) createTransaction(@Req() req: any, @Body() d: CreateTransactionDto) { return this.service.createTransaction(req.user.tenantId, d); }

  @Get('reports/tax') @Roles(...READ_ROLES) taxReport(@Req() req: any) { return this.service.getTaxReport(req.user.tenantId); }
  @Get('reports/profit-and-loss') @Roles(...READ_ROLES) profitAndLoss(@Req() req: any) { return this.service.getProfitAndLoss(req.user.tenantId); }
  @Get('reports/cash-flow') @Roles(...READ_ROLES) cashFlow(@Req() req: any) { return this.service.getCashFlow(req.user.tenantId); }
  @Get('reports/balance-sheet') @Roles(...READ_ROLES) balanceSheet(@Req() req: any) { return this.service.getBalanceSheet(req.user.tenantId); }
  @Get('reports/vendor-payments') @Roles(...READ_ROLES) vendorPayments(@Req() req: any) { return this.service.getVendorPayments(req.user.tenantId); }
  @Get('reports/event-profitability') @Roles(...READ_ROLES) eventProfitability(@Req() req: any) { return this.service.getEventProfitability(req.user.tenantId); }
}
