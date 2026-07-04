import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../shared/outbox.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { ConfigService } from '@nestjs/config';

export interface QuoteRequestDetails {
  items: { name: string; quantity: number; price?: number }[];
  notes?: string;
}

export interface QuoteResult {
  conversionId: string;
  quoteText: string;
}

@Injectable()
export class QuoteRequestService {
  private readonly logger = new Logger(QuoteRequestService.name);

  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
    private emailAdapter: EmailAdapter,
    private config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------
  async createQuoteRequest(leadId: string, details: QuoteRequestDetails) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    const conversion = await this.prisma.conversion.create({
      data: {
        destination: 'QUOTE_REQUEST',
        status: 'REQUESTED',
        leadId,
        metadata: {
          items: details.items,
          notes: details.notes || '',
          requestedAt: new Date().toISOString(),
        },
      },
      include: { lead: { include: { contact: true } } },
    });

    this.logger.log(`Quote request created: ${conversion.id} for lead ${leadId}`);
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // GET / READ
  // ---------------------------------------------------------------------------
  async getQuoteRequest(id: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
      include: { lead: { include: { contact: true, assignedAgent: true } } },
    });
    if (!conversion) throw new NotFoundException(`Quote request ${id} not found`);
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // GENERATE QUOTE TEXT
  // ---------------------------------------------------------------------------
  async generateQuoteQuote(requestId: string): Promise<QuoteResult> {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: requestId },
      include: {
        lead: {
          include: {
            contact: true,
            assignedAgent: true,
          },
        },
      },
    });
    if (!conversion) throw new NotFoundException(`Quote request ${requestId} not found`);
    if (conversion.destination !== 'QUOTE_REQUEST') {
      throw new BadRequestException(`Conversion ${requestId} is not a quote request`);
    }

    const metadata = conversion.metadata as any;
    const items: { name: string; quantity: number; price?: number }[] = metadata?.items || [];
    const notes: string = metadata?.notes || '';
    const contact = conversion.lead.contact;
    const agent = conversion.lead.assignedAgent;
    const businessName = this.config.get<string>('BUSINESS_NAME', 'Our Company');

    // Build a nicely formatted quote
    let quoteText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    quoteText += `            ${businessName}\n`;
    quoteText += `            Q U O T A T I O N\n`;
    quoteText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    quoteText += `Date:        ${new Date().toLocaleDateString('en-IN')}\n`;
    quoteText += `Quote Ref:   ${conversion.id.slice(0, 8).toUpperCase()}\n`;
    quoteText += `Customer:    ${contact?.name || 'Valued Customer'}\n`;
    if (contact?.company) quoteText += `Company:     ${contact.company}\n`;
    quoteText += `\n`;

    quoteText += `───────────────────────────────────────\n`;
    quoteText += `  #  | Item                         | Qty |  Price  \n`;
    quoteText += `───────────────────────────────────────\n`;

    let total = 0;
    items.forEach((item, i) => {
      const lineTotal = item.price ? item.price * item.quantity : 0;
      total += lineTotal;
      const name = item.name.padEnd(29).slice(0, 29);
      const qty = String(item.quantity).padStart(3);
      const price = item.price != null ? `$${item.price.toFixed(2)}`.padStart(7) : '  ---  ';
      quoteText += `  ${(i + 1).toString().padStart(2)} | ${name} | ${qty} | ${price}\n`;
    });

    if (items.some(i => i.price != null)) {
      quoteText += `───────────────────────────────────────\n`;
      quoteText += `  TOTAL${' '.repeat(38)}$${total.toFixed(2)}\n`;
    }
    quoteText += `───────────────────────────────────────\n\n`;

    if (notes) {
      quoteText += `Notes:\n${notes}\n\n`;
    }

    quoteText += `Valid until: ${new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}\n`;

    if (agent) {
      quoteText += `\nPrepared by: ${agent.name}\n`;
    }

    quoteText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    quoteText += `         Thank you for your interest!\n`;
    quoteText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    // Persist the generated quote text in metadata
    await this.prisma.conversion.update({
      where: { id: conversion.id },
      data: {
        status: 'IN_PROGRESS',
        metadata: { ...metadata, quoteText, generatedAt: new Date().toISOString() },
      },
    });

    this.logger.log(`Quote generated for conversion ${conversion.id}`);
    return { conversionId: conversion.id, quoteText };
  }

  // ---------------------------------------------------------------------------
  // SEND QUOTE
  // ---------------------------------------------------------------------------
  async sendQuote(conversionId: string, channel: 'WHATSAPP' | 'EMAIL') {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: conversionId },
      include: {
        lead: { include: { contact: true } },
      },
    });
    if (!conversion) throw new NotFoundException(`Conversion ${conversionId} not found`);

    const metadata = conversion.metadata as any;
    const quoteText: string = metadata?.quoteText;
    if (!quoteText) {
      throw new BadRequestException('Quote has not been generated yet. Call generate first.');
    }

    const contact = conversion.lead.contact;
    if (!contact) {
      throw new BadRequestException('Lead has no associated contact');
    }

    if (channel === 'WHATSAPP') {
      if (!contact.whatsapp) {
        throw new BadRequestException('Contact has no WhatsApp number');
      }
      const outboxId = await this.outbox.enqueue({
        channel: 'WHATSAPP',
        recipient: contact.whatsapp,
        text: quoteText,
        leadId: conversion.leadId,
        contactId: contact.id,
      });

      // Mark sent
      await this.prisma.conversion.update({
        where: { id: conversionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: { ...metadata, sentVia: 'WHATSAPP', sentAt: new Date().toISOString() },
        },
      });

      return { sent: true, channel: 'WHATSAPP', outboxId };
    }

    if (channel === 'EMAIL') {
      if (!contact.email) {
        throw new BadRequestException('Contact has no email address');
      }

      const businessName = this.config.get<string>('BUSINESS_NAME', 'Our Company');
      const htmlBody = quoteText
        .replace(/\n/g, '<br>')
        .replace(/━━━━+/g, '<hr>')
        .replace(/──────────────────────+/g, '<hr>');

      const emailResult = await this.emailAdapter.send(
        contact.email,
        `Your Quote from ${businessName} — ${conversion.id.slice(0, 8).toUpperCase()}`,
        `<pre style="font-family: monospace; font-size: 14px; line-height: 1.5;">${htmlBody}</pre>`,
      );

      await this.prisma.conversion.update({
        where: { id: conversionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: { ...metadata, sentVia: 'EMAIL', sentAt: new Date().toISOString() },
        },
      });

      return { sent: emailResult.success, channel: 'EMAIL', error: emailResult.error };
    }

    throw new BadRequestException(`Unsupported channel: ${channel}. Use WHATSAPP or EMAIL.`);
  }
}
