import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

/**
 * Renders an invoice (or quotation) to a one-page A4 PDF and writes it under
 * STORAGE_PATH/invoices, returning both the on-disk path and the public URL
 * that /uploads serves. Pure pdfkit — no headless Chrome — so it stays inside
 * the 512MB backend container without a browser dependency.
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private storageRoot(): string {
    return this.config.get<string>('STORAGE_PATH') || './uploads';
  }

  private fmtMoney(n: number, currency: string): string {
    const symbol = currency === 'INR' ? 'Rs. ' : currency === 'USD' ? '$' : `${currency} `;
    return symbol + (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Generate a PDF for an existing invoice. Returns { filePath, publicUrl,
   * fileName }. Idempotent-ish: always writes a fresh file named by invoice
   * number so re-sends reflect the latest data.
   */
  async generateInvoicePdf(tenantId: string, invoiceId: string): Promise<{ filePath: string; publicUrl: string; fileName: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lineItems: true, contact: true },
    });
    if (!invoice) throw new Error('Invoice not found');

    const settings = await this.prisma.businessSettings.findFirst();
    const currency = settings?.defaultCurrency || 'INR';

    const dir = path.join(this.storageRoot(), 'invoices');
    fs.mkdirSync(dir, { recursive: true });
    const fileName = `${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(dir, fileName);

    await this.renderDocument({
      filePath,
      docType: 'INVOICE',
      number: invoice.invoiceNumber,
      status: invoice.status,
      createdAt: invoice.createdAt,
      business: {
        name: settings?.businessName || 'Your Business',
        email: settings?.defaultEmail || undefined,
        phone: settings?.notificationPhone || undefined,
        logoUrl: settings?.logoUrl || undefined,
        primaryColor: settings?.primaryColor || '#0B5',
      },
      client: {
        name: invoice.contact?.name || 'Client',
        email: invoice.contact?.email || undefined,
        phone: invoice.contact?.phone || undefined,
      },
      lineItems: invoice.lineItems.map(li => ({ description: li.description, qty: li.qty, unitPrice: li.unitPrice, total: li.total })),
      subtotal: invoice.subtotal,
      gstPercent: invoice.gstPercent || 0,
      gstTotal: invoice.gstTotal,
      grandTotal: invoice.grandTotal,
      currency,
    });

    const publicBase = this.config.get<string>('PUBLIC_URL', '');
    const publicUrl = `${publicBase}/uploads/invoices/${fileName}`;
    this.logger.log(`Generated invoice PDF ${fileName}`);
    return { filePath, publicUrl, fileName };
  }

  private renderDocument(opts: {
    filePath: string;
    docType: 'INVOICE' | 'QUOTATION';
    number: string;
    status: string;
    createdAt: Date;
    business: { name: string; email?: string; phone?: string; logoUrl?: string; primaryColor: string };
    client: { name: string; email?: string; phone?: string };
    lineItems: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
    subtotal: number;
    gstPercent: number;
    gstTotal: number;
    grandTotal: number;
    currency: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(opts.filePath);
        stream.on('finish', () => resolve());
        stream.on('error', reject);
        doc.pipe(stream);

        const accent = opts.business.primaryColor || '#0B5';
        const pageW = doc.page.width;
        const left = 50;
        const right = pageW - 50;

        // ── Header band ──
        doc.rect(0, 0, pageW, 110).fill(accent);
        doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
          .text(opts.business.name, left, 34, { width: right - left - 160 });
        doc.fontSize(28).font('Helvetica-Bold')
          .text(opts.docType, right - 160, 34, { width: 160, align: 'right' });
        doc.fontSize(9).font('Helvetica')
          .text(`# ${opts.number}`, right - 160, 68, { width: 160, align: 'right' });

        // ── Business contact + meta ──
        doc.fillColor('#333333').fontSize(9).font('Helvetica');
        let by = 128;
        const bizLines = [opts.business.email, opts.business.phone].filter(Boolean) as string[];
        bizLines.forEach(l => { doc.text(l, left, by); by += 13; });

        const dateStr = new Date(opts.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.fontSize(9).fillColor('#666666')
          .text(`Date: ${dateStr}`, right - 200, 128, { width: 200, align: 'right' })
          .text(`Status: ${opts.status}`, right - 200, 141, { width: 200, align: 'right' });

        // ── Bill-to ──
        const billY = Math.max(by, 165) + 8;
        doc.fillColor('#999999').fontSize(8).font('Helvetica-Bold').text('BILL TO', left, billY);
        doc.fillColor('#111111').fontSize(12).font('Helvetica-Bold').text(opts.client.name, left, billY + 12);
        doc.fillColor('#555555').fontSize(9).font('Helvetica');
        let cy = billY + 30;
        [opts.client.email, opts.client.phone].filter(Boolean).forEach(l => { doc.text(l as string, left, cy); cy += 12; });

        // ── Line items table ──
        let ty = cy + 20;
        const colDesc = left;
        const colQty = 320;
        const colPrice = 380;
        const colTotal = 470;

        doc.rect(left, ty, right - left, 22).fill('#f2f2f2');
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text('DESCRIPTION', colDesc + 6, ty + 7);
        doc.text('QTY', colQty, ty + 7, { width: 50, align: 'right' });
        doc.text('RATE', colPrice, ty + 7, { width: 80, align: 'right' });
        doc.text('AMOUNT', colTotal, ty + 7, { width: right - colTotal - 6, align: 'right' });
        ty += 22;

        doc.font('Helvetica').fillColor('#222222').fontSize(9);
        opts.lineItems.forEach((li, i) => {
          const rowH = Math.max(20, doc.heightOfString(li.description, { width: colQty - colDesc - 12 }) + 8);
          if (i % 2 === 1) doc.rect(left, ty, right - left, rowH).fill('#fafafa');
          doc.fillColor('#222222')
            .text(li.description, colDesc + 6, ty + 5, { width: colQty - colDesc - 12 })
            .text(String(li.qty), colQty, ty + 5, { width: 50, align: 'right' })
            .text(this.fmtMoney(li.unitPrice, opts.currency), colPrice, ty + 5, { width: 80, align: 'right' })
            .text(this.fmtMoney(li.total, opts.currency), colTotal, ty + 5, { width: right - colTotal - 6, align: 'right' });
          ty += rowH;
        });

        // ── Totals ──
        doc.moveTo(left, ty).lineTo(right, ty).strokeColor('#e0e0e0').stroke();
        ty += 10;
        const totalsX = 360;
        const drawTotal = (label: string, val: string, bold = false) => {
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9)
            .fillColor(bold ? '#000000' : '#555555')
            .text(label, totalsX, ty, { width: 100, align: 'right' })
            .text(val, colTotal, ty, { width: right - colTotal - 6, align: 'right' });
          ty += bold ? 20 : 16;
        };
        drawTotal('Subtotal', this.fmtMoney(opts.subtotal, opts.currency));
        if (opts.gstPercent) drawTotal(`GST (${opts.gstPercent}%)`, this.fmtMoney(opts.gstTotal, opts.currency));
        ty += 2;
        doc.rect(totalsX - 6, ty - 2, right - totalsX + 6, 26).fill(accent);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
          .text('TOTAL', totalsX, ty + 5, { width: 100, align: 'right' })
          .text(this.fmtMoney(opts.grandTotal, opts.currency), colTotal, ty + 5, { width: right - colTotal - 6, align: 'right' });

        // ── Footer ──
        doc.fillColor('#999999').font('Helvetica').fontSize(8)
          .text(`Thank you for your business.  •  ${opts.business.name}`, left, doc.page.height - 60, { width: right - left, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
