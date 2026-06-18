import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TimelineEntry {
  type: string;
  title: string;
  description?: string;
  leadId?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
  createdById?: string;
}

@Injectable()
export class TimelineService {
  constructor(private prisma: PrismaService) {}

  async add(entry: TimelineEntry) {
    return this.prisma.timelineItem.create({ data: entry as any });
  }

  async getByLead(leadId: string) {
    return this.prisma.timelineItem.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getByContact(contactId: string) {
    return this.prisma.timelineItem.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async recordLeadCreated(leadId: string, details?: Record<string, unknown>) {
    return this.add({ type: 'lead_created', title: 'Lead created', leadId, metadata: details });
  }

  async recordMessageReceived(leadId: string, channel: string) {
    return this.add({ type: 'message_received', title: `Message received via ${channel}`, leadId });
  }

  async recordMessageSent(leadId: string, channel: string) {
    return this.add({ type: 'message_sent', title: `Message sent via ${channel}`, leadId });
  }

  async recordScoreChanged(leadId: string, oldScore: number, newScore: number) {
    return this.add({ type: 'score_changed', title: `Score: ${oldScore} → ${newScore}`, leadId, metadata: { oldScore, newScore } });
  }

  async recordSegmentChanged(leadId: string, segment: string) {
    return this.add({ type: 'segment_changed', title: `Segment: ${segment}`, leadId });
  }

  async recordAssigned(leadId: string, agentName?: string) {
    return this.add({ type: 'assigned', title: agentName ? `Assigned to ${agentName}` : 'Lead assigned', leadId });
  }

  async recordCRMPush(leadId: string, crm: string, success: boolean) {
    return this.add({ type: success ? 'crm_push_succeeded' : 'crm_push_failed', title: `CRM push to ${crm}: ${success ? 'succeeded' : 'failed'}`, leadId });
  }

  async recordConversion(leadId: string, destination: string) {
    return this.add({ type: 'conversion', title: `Converted: ${destination}`, leadId });
  }

  async recordAutomationFailed(leadId: string, reason: string) {
    return this.add({ type: 'automation_failed', title: `Automation failed: ${reason}`, leadId });
  }
}
