import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../shared/outbox.service';
import { EmailAdapter } from '../shared/adapters/email.adapter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface RegistrationData {
  email: string;
  name: string;
  phone?: string;
  preferences?: Record<string, unknown>;
}

@Injectable()
export class MemberRegistrationService {
  private readonly logger = new Logger(MemberRegistrationService.name);

  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
    private emailAdapter: EmailAdapter,
    private config: ConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // REGISTER MEMBER
  // ---------------------------------------------------------------------------
  async registerMember(leadId: string, registrationData: RegistrationData) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: true },
    });
    if (!lead) throw new NotFoundException(`Lead ${leadId} not found`);

    // Check if a user already exists for this email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registrationData.email },
    });

    let userId: string | null = null;
    if (existingUser) {
      userId = existingUser.id;
      this.logger.log(`Existing user found for email ${registrationData.email}, linking registration`);
    } else {
      // Create a User record with role SALES_AGENT
      const tempPassword = crypto.randomBytes(12).toString('hex');
      const bcrypt = await import('bcryptjs');
      const hashed = await bcrypt.hash(tempPassword, 12);

      const newUser = await this.prisma.user.create({
        data: {
          email: registrationData.email,
          name: registrationData.name,
          phone: registrationData.phone || null,
          password: hashed,
          role: 'SALES_AGENT',
          tenantId: lead.tenantId,
        },
      });
      userId = newUser.id;

      this.logger.log(`New user created for registration: ${newUser.id} (${registrationData.email})`);

      // Send welcome email with temp password
      const businessName = this.config.get<string>('BUSINESS_NAME', 'Our Company');
      const dashboardUrl = this.config.get<string>('DASHBOARD_URL', 'http://localhost:3000');
      await this.emailAdapter.send(
        registrationData.email,
        `Welcome to ${businessName} — Your Membership`,
        `<h2>Welcome to ${businessName}!</h2>
         <p>Dear ${registrationData.name},</p>
         <p>Your membership has been created successfully.</p>
         <p>You can log in to your account at <a href="${dashboardUrl}">${dashboardUrl}</a></p>
         <p>Your temporary password is: <strong>${tempPassword}</strong></p>
         <p>Please change your password after your first login.</p>`,
      );
    }

    const metadata = {
      email: registrationData.email,
      name: registrationData.name,
      phone: registrationData.phone || '',
      preferences: registrationData.preferences || {},
      userId,
      registeredAt: new Date().toISOString(),
    };

    const conversion = await this.prisma.conversion.create({
      data: {
        destination: 'MEMBER_REGISTRATION',
        status: 'REQUESTED',
        leadId,
        requestedById: userId,
        metadata: metadata as any,
      },
      include: { lead: { include: { contact: true } } },
    });

    this.logger.log(`Member registration created: ${conversion.id} for lead ${leadId} (user: ${userId})`);
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // GET REGISTRATION
  // ---------------------------------------------------------------------------
  async getRegistration(id: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
      include: { lead: { include: { contact: true, assignedAgent: true } } },
    });
    if (!conversion) throw new NotFoundException(`Registration ${id} not found`);
    if (conversion.destination !== 'MEMBER_REGISTRATION') {
      throw new BadRequestException(`Conversion ${id} is not a member registration`);
    }
    return conversion;
  }

  // ---------------------------------------------------------------------------
  // COMPLETE REGISTRATION
  // ---------------------------------------------------------------------------
  async completeRegistration(id: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id },
      include: { lead: { include: { contact: true } } },
    });
    if (!conversion) throw new NotFoundException(`Registration ${id} not found`);
    if (conversion.destination !== 'MEMBER_REGISTRATION') {
      throw new BadRequestException(`Conversion ${id} is not a member registration`);
    }
    if (conversion.status === 'COMPLETED') {
      throw new BadRequestException(`Registration ${id} is already completed`);
    }

    const metadata = conversion.metadata as any;

    const updated = await this.prisma.conversion.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        metadata: { ...metadata, completedAt: new Date().toISOString() } as any,
      },
      include: { lead: { include: { contact: true, assignedAgent: true } } },
    });

    // Send welcome message via WhatsApp if contact has a WhatsApp number
    const contact = conversion.lead.contact;
    if (contact?.whatsapp) {
      const businessName = this.config.get<string>('BUSINESS_NAME', 'Our Company');
      const welcomeMsg = `Welcome to ${businessName}, ${metadata.name || contact.name}! 🎉 Your membership registration is now complete. We're excited to have you on board!`;

      const outboxId = await this.outbox.enqueue({
        channel: 'WHATSAPP',
        recipient: contact.whatsapp,
        text: welcomeMsg,
        leadId: conversion.leadId,
        contactId: contact.id,
      });
      this.logger.log(`Welcome WhatsApp sent for registration ${id} (outbox: ${outboxId})`);
    }

    this.logger.log(`Member registration completed: ${id}`);
    return updated;
  }
}
