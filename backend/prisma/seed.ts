import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
    console.log('Seeding blocked in production. Set ALLOW_PROD_SEED=true to override.');
    process.exit(0);
  }

  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const ownerName = process.env.SEED_OWNER_NAME || 'Business Owner';

  if (!ownerEmail) throw new Error('SEED_OWNER_EMAIL is required for seeding');
  if (!ownerPassword) throw new Error('SEED_OWNER_PASSWORD is required for seeding');

  const hashed = await bcrypt.hash(ownerPassword, 12);

  await prisma.tenant.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: { id: 'default-tenant', name: 'Default', slug: 'default' },
  });

  const user = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: { name: ownerName, password: hashed, role: 'OWNER', active: true },
    create: { email: ownerEmail, name: ownerName, password: hashed, role: 'OWNER', active: true, tenantId: 'default-tenant' },
  });

  await prisma.businessSettings.upsert({
    where: { id: (await prisma.businessSettings.findFirst())?.id || 'seed-bs' },
    update: { businessName: 'LeadAuto', timezone: 'America/New_York', defaultCurrency: 'USD' },
    create: { businessName: 'LeadAuto', timezone: 'America/New_York', defaultCurrency: 'USD' },
  });

  await prisma.scoringRule.createMany({
    data: [
      { name: 'Phone exists', description: 'Contact has phone number', field: 'contact.phone', operator: 'exists', value: 'true', points: 10 },
      { name: 'Email exists', description: 'Contact has email', field: 'contact.email', operator: 'exists', value: 'true', points: 5 },
      { name: 'Budget exists', description: 'Lead has budget info', field: 'budget', operator: 'exists', value: 'true', points: 15 },
      { name: 'Urgent timeline', description: 'Lead is urgent', field: 'urgency', operator: 'contains', value: 'urgent', points: 20 },
      { name: 'Mentions appointment', description: 'Message contains appointment keyword', field: 'message', operator: 'contains', value: 'appointment', points: 30 },
      { name: 'Mentions pricing', description: 'Message contains pricing keyword', field: 'message', operator: 'contains', value: 'pricing', points: 25 },
      { name: 'Spam or invalid', description: 'Lead marked as spam', field: 'status', operator: 'equals', value: 'SPAM', points: -100 },
    ],
    skipDuplicates: true,
  });

  const twilioExists = await prisma.integration.findFirst({ where: { type: 'TWILIO' } });
  if (!twilioExists) {
    await prisma.integration.create({
      data: { tenantId: 'default-tenant', type: 'TWILIO', name: 'Twilio SMS', config: { accountSid: 'ACdemo1234', authToken: 'demo_token', fromNumber: '+15551234567' }, isActive: true, status: 'connected', lastTested: new Date() },
    });
    console.log('Created demo Twilio integration');
  }

  const stageCount = await prisma.pipelineStage.count();
  if (stageCount === 0) {
    await prisma.pipelineStage.createMany({
      data: [
        { name: 'New', order: 0, color: '#3b82f6', isDefault: true, isEnd: false },
        { name: 'Contacted', order: 1, color: '#f59e0b', isDefault: false, isEnd: false },
        { name: 'Qualified', order: 2, color: '#8b5cf6', isDefault: false, isEnd: false },
        { name: 'Proposal', order: 3, color: '#f97316', isDefault: false, isEnd: false },
        { name: 'Negotiation', order: 4, color: '#ec4899', isDefault: false, isEnd: false },
        { name: 'Won', order: 5, color: '#10b981', isDefault: false, isEnd: true },
        { name: 'Lost', order: 6, color: '#ef4444', isDefault: false, isEnd: true },
      ],
    });
  }

  const contactCount = await prisma.contact.count();
  if (contactCount < 5) {
    const contacts = await Promise.all([
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Emma Johnson', email: 'emma@brightpath.com', phone: '+12125550147', company: 'BrightPath Solutions', location: 'New York, NY', tags: ['vip'], consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Liam Williams', email: 'liam@novatech.com', phone: '+13105550283', company: 'NovaTech Industries', location: 'Los Angeles, CA', consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Olivia Brown', email: 'olivia@summitdigital.com', phone: '+13125550391', company: 'Summit Digital', location: 'Chicago, IL', tags: ['hot'], consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Noah Garcia', email: 'noah@pinnacle.com', phone: '+17135550456', company: 'Pinnacle Group', location: 'Houston, TX', consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Ava Martinez', email: 'ava@horizonmedia.com', phone: '+13055550892', company: 'Horizon Media', location: 'Miami, FL', consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'James Lee', email: 'james@vertex.com', phone: '+14155550123', company: 'Vertex Analytics', location: 'San Francisco, CA', consentStatus: 'opted_in' } }),
      prisma.contact.create({ data: { tenantId: 'default-tenant', name: 'Sophia Taylor', email: 'sophia@crest.com', phone: '+12145550789', company: 'Crest Financial', location: 'Dallas, TX', consentStatus: 'unknown' } }),
    ]);

    const statuses = ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED', 'PROPOSAL_SENT', 'APPOINTMENT_BOOKED', 'CONVERTED', 'LOST', 'COLD'] as const;
    const sources = ['CAMPAIGN', 'QR_CODE', 'FORM', 'CHATBOT', 'WHATSAPP', 'SOCIAL_MEDIA', 'PHONE_CALL'] as const;
    const segments = ['HOT', 'WARM', 'COLD', 'UNQUALIFIED'] as const;

    const leads = await Promise.all(
      contacts.slice(0, 6).map((contact, i) =>
        prisma.lead.create({
          data: {
            tenantId: 'default-tenant', contactId: contact.id,
            status: i === 0 ? 'APPOINTMENT_BOOKED' : i === 1 ? 'QUALIFIED' : i === 2 ? 'QUALIFIED' : statuses[i % statuses.length],
            segment: i < 2 ? 'HOT' : i < 5 ? 'WARM' : 'COLD',
            source: sources[i % sources.length],
            score: Math.floor(Math.random() * 85) + 10, priority: i < 2 ? 1 : 2,
            interest: ['Interested in premium plan', 'Requested demo', 'Comparing options', 'Need pricing', 'Looking for enterprise'][i % 5],
            budget: ['$1k-$5k', '$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+'][i % 5],
            message: contact.name ? `Hi, I'm ${contact.name} from ${contact.company}. Interested in learning more.` : 'Hi, interested in your services.',
            tags: i < 2 ? ['vip', 'high-value'] : [],
            assignedAgentId: user?.id || undefined,
          },
        })
      ),
    );

    const messages = [
      { text: 'Hi, I saw your ad on Facebook. Can you tell me more about your pricing?', direction: 'INBOUND' as const, channel: 'WHATSAPP' as const },
      { text: 'Of course! We offer several plans starting at $49/month. What features are most important to you — automation, CRM integration, or analytics?', direction: 'OUTBOUND' as const, channel: 'WHATSAPP' as const },
      { text: 'CRM integration is critical for us. We use HubSpot.', direction: 'INBOUND' as const, channel: 'WHATSAPP' as const },
      { text: 'We have native HubSpot integration! Would you like me to schedule a demo for this week? I have slots Thursday at 2pm or Friday at 10am.', direction: 'OUTBOUND' as const, channel: 'WHATSAPP' as const },
      { text: 'Thursday 2pm works great!', direction: 'INBOUND' as const, channel: 'WHATSAPP' as const },
      { text: 'What is your timeline for implementation?', direction: 'OUTBOUND' as const, channel: 'CHATBOT' as const },
      { text: 'We are looking to get started within the next 2 weeks.', direction: 'INBOUND' as const, channel: 'CHATBOT' as const },
      { text: 'And your approximate budget range?', direction: 'OUTBOUND' as const, channel: 'CHATBOT' as const },
      { text: 'Our budget is around $5k-$10k annually.', direction: 'INBOUND' as const, channel: 'CHATBOT' as const },
      { text: 'I would recommend our Business plan at $299/month — it includes all CRM integrations, unlimited automations, and priority support. I can also add a 10% discount for annual billing.', direction: 'OUTBOUND' as const, channel: 'CHATBOT' as const },
      { text: 'Sounds interesting! Can you send me more details?', direction: 'INBOUND' as const, channel: 'EMAIL' as const },
      { text: 'Hi, is this still available? I submitted a form last week but got no response.', direction: 'INBOUND' as const, channel: 'SMS' as const },
      { text: 'Hi! Sorry for the delay. Yes, absolutely — I can help you right now. What questions do you have?', direction: 'OUTBOUND' as const, channel: 'SMS' as const },
      { text: 'Just checking in — have you had a chance to review the proposal I sent?', direction: 'OUTBOUND' as const, channel: 'EMAIL' as const },
    ];

    for (let i = 0; i < messages.length; i++) {
      await prisma.conversationMessage.create({
        data: { text: messages[i].text, channel: messages[i].channel, direction: messages[i].direction, leadId: leads[i % leads.length].id, contactId: contacts[i % contacts.length].id, createdAt: new Date(Date.now() - (messages.length - i) * 3600000) },
      });
    }

    const now = new Date();
    await prisma.webhookEvent.createMany({
      data: [
        { provider: 'whatsapp', eventType: 'whatsapp_message', idempotencyKey: 'seed-wa-1', rawPayload: {}, status: 'processed', createdAt: new Date(now.getTime() - 300000) },
        { provider: 'forms', eventType: 'form_submit', idempotencyKey: 'seed-form-1', rawPayload: {}, status: 'processed', createdAt: new Date(now.getTime() - 600000) },
        { provider: 'chatbot', eventType: 'chatbot_message', idempotencyKey: 'seed-cb-1', rawPayload: {}, status: 'processed', createdAt: new Date(now.getTime() - 30000) },
        { provider: 'social', eventType: 'social_lead', idempotencyKey: 'seed-social-1', rawPayload: {}, status: 'processed', createdAt: new Date(now.getTime() - 7200000) },
        { provider: 'payments', eventType: 'payment', idempotencyKey: 'seed-pay-1', rawPayload: {}, status: 'processed', createdAt: new Date(now.getTime() - 3600000) },
      ],
      skipDuplicates: true,
    });

    await prisma.task.createMany({
      data: [
        { title: 'Follow up with Emma Johnson', description: 'Send pricing proposal after demo', status: 'PENDING', priority: 'HIGH', leadId: leads[0].id, assigneeId: user?.id, dueAt: new Date(now.getTime() + 86400000) },
        { title: 'Prepare demo for NovaTech', description: 'Set up personalized walkthrough', status: 'IN_PROGRESS', priority: 'HIGH', leadId: leads[1].id, assigneeId: user?.id, dueAt: new Date(now.getTime() + 172800000) },
        { title: 'Send contract to Summit Digital', description: 'Include case studies and pricing', status: 'PENDING', priority: 'MEDIUM', leadId: leads[2].id, assigneeId: user?.id, dueAt: new Date(now.getTime() + 259200000) },
      ],
    });

    await prisma.healthCheck.createMany({
      data: [
        { service: 'database', status: 'ok', latencyMs: 12, checkedAt: new Date() },
        { service: 'redis', status: 'ok', latencyMs: 3, checkedAt: new Date() },
        { service: 'agent-service', status: 'ok', latencyMs: 45, checkedAt: new Date() },
        { service: 'n8n', status: 'ok', latencyMs: 120, checkedAt: new Date() },
        { service: 'whatsapp-api', status: 'ok', latencyMs: 210, checkedAt: new Date() },
      ],
    });

    console.log(`Created ${contacts.length} contacts, ${leads.length} leads, ${messages.length} conversations, and demo data`);
  }

  console.log('Seed completed');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
