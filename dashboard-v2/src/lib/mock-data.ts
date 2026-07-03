import type { Lead, Message, AICampaignDraft } from './types';

const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia', 'Lucas', 'Charlotte', 'James', 'Amelia', 'Benjamin', 'Harper', 'Elijah', 'Evelyn', 'Alexander'];
const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee'];
const companies = ['BrightPath Solutions', 'NovaTech Industries', 'Summit Digital', 'Pinnacle Group', 'Horizon Media', 'Vertex Analytics', 'Meridian Health', 'Crest Financial', 'Apex Logistics', 'Stellar Innovations'];
const statuses = ['NEW', 'CONTACTED', 'ENGAGED', 'QUALIFYING', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;
const segments = ['HOT', 'WARM', 'COLD', 'UNQUALIFIED'] as const;
const sources = ['CAMPAIGN', 'QR_CODE', 'FORM', 'CHATBOT', 'WHATSAPP', 'SOCIAL_MEDIA'] as const;

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  d.setHours(randomInt(8, 18), randomInt(0, 59));
  return d.toISOString();
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const interests = ['Interested in premium plan', 'Requested demo', 'Comparing options', 'Need pricing info', 'Looking for enterprise solution', 'Quick question about features'];
const budgets = ['$1k-$5k', '$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+'];

function generatePhone(): string {
  return `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function buildLead(i: number): Lead {
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  const status = randomItem(statuses);
  const segment = randomItem(segments);
  return {
    id: `lead-${i + 1}`,
    status, segment, source: randomItem(sources),
    score: randomInt(10, 95), priority: randomInt(1, 5),
    interest: randomItem(interests), budget: randomItem(budgets),
    tags: status === 'CONVERTED' ? ['vip', 'high-value'] : segment === 'HOT' ? ['urgent'] : [],
    createdAt: randomDate(60), updatedAt: randomDate(7),
    contact: {
      id: `contact-${i + 1}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(companies).toLowerCase().replace(/\s/g, '')}.com`,
      phone: generatePhone(),
      company: randomItem(companies),
      location: randomItem(['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Miami, FL', 'Seattle, WA', 'Austin, TX', 'Denver, CO']),
      tags: [], createdAt: randomDate(90),
    },
  };
}

export const mockLeads: Lead[] = Array.from({ length: 25 }, (_, i) => buildLead(i));

export const mockAnalytics = { total: 1247, hot: 89, warm: 312, cold: 546, converted: 187, lost: 113, conversionRate: '15.2' };
export const mockAnalyticsSources = [
  { source: 'CAMPAIGN', count: 423 }, { source: 'QR_CODE', count: 187 }, { source: 'FORM', count: 298 },
  { source: 'CHATBOT', count: 156 }, { source: 'WHATSAPP', count: 89 }, { source: 'SOCIAL_MEDIA', count: 94 },
];
export const mockAnalyticsAgents = [
  { id: 'agent-1', name: 'Sarah Chen', role: 'Sales Rep', assignedLeads: 34, converted: 12 },
  { id: 'agent-2', name: 'Marcus Rivera', role: 'Sales Rep', assignedLeads: 28, converted: 9 },
  { id: 'agent-3', name: 'Priya Patel', role: 'Senior Rep', assignedLeads: 41, converted: 18 },
];

export const mockHealth = {
  status: 'ok', timestamp: new Date().toISOString(), version: '2.4.1', uptime: 172800,
  checks: { database: 'connected', redis: 'connected', queue: 'operational', api: 'healthy' },
};

export const mockFailures = [
  { id: 'fail-1', type: 'WEBHOOK', status: 'OPEN', severity: 'HIGH', message: 'Failed to send webhook to Slack', attempts: 3, maxAttempts: 5, leadId: 'lead-3', provider: 'slack', operation: 'send_message', createdAt: randomDate(1) },
  { id: 'fail-2', type: 'EMAIL', status: 'OPEN', severity: 'MEDIUM', message: 'Email delivery failed: mailbox full', attempts: 2, maxAttempts: 3, leadId: 'lead-7', provider: 'sendgrid', operation: 'send', createdAt: randomDate(2) },
  { id: 'fail-3', type: 'WHATSAPP', status: 'OPEN', severity: 'LOW', message: 'Template not approved by Meta', attempts: 1, maxAttempts: 3, leadId: 'lead-12', provider: 'whatsapp', operation: 'send_template', createdAt: randomDate(3) },
];

export function getMockTimeline(_leadId: string): any[] {
  const events = [
    { title: 'Lead captured via web form', type: 'capture' },
    { title: 'Auto-reply sent via WhatsApp', type: 'message' },
    { title: 'Qualification score updated to 78', type: 'score' },
    { title: 'Assigned to sales team', type: 'assign' },
    { title: 'Email opened — pricing page link clicked', type: 'engagement' },
    { title: 'Follow-up task completed', type: 'task' },
    { title: 'Call scheduled for tomorrow', type: 'booking' },
  ];
  return pick(events, randomInt(2, 5)).map((e, i) => ({ id: `tl-${_leadId}-${i}`, ...e, createdAt: randomDate(14) }));
}

const msgTexts = [
  'Hi, I was wondering about your pricing plans for the enterprise tier?',
  'Thanks for reaching out! Let me share some more details about our platform.',
  'Can you send me a demo link? I\'d like to see it in action.',
  'Sure, I\'m available for a call this Thursday at 2pm.',
  'We\'ve decided to go with your solution. Can we set up onboarding?',
  'Just following up on our conversation last week. Any questions?',
  'This looks exactly what we need for our team!',
  'Could you clarify the difference between the Pro and Business plans?',
  'I signed up for the trial but haven\'t received the welcome email.',
  'Great product! We\'re seeing 40% more engagement already.',
  'Do you offer custom integrations with our existing CRM?',
  'Our team loves the automation features. Game changer!',
];

export const mockMessages: Message[] = Array.from({ length: 20 }, (_, i) => ({
  id: `msg-${i + 1}`,
  text: randomItem(msgTexts),
  channel: randomItem(['WHATSAPP', 'EMAIL', 'SMS'] as const),
  direction: randomItem(['INBOUND', 'OUTBOUND'] as const),
  leadId: `lead-${randomInt(1, 25)}`,
  createdAt: randomDate(14),
}));

export const mockCampaigns = [
  { id: 'camp-1', name: 'Summer Outreach 2026', sourceType: 'WHATSAPP', offer: 'Free consultation', active: true, _count: { leads: 142 }, createdAt: randomDate(45) },
  { id: 'camp-2', name: 'Webinar Replay Follow-up', sourceType: 'EMAIL', offer: 'Exclusive discount', active: true, _count: { leads: 89 }, createdAt: randomDate(30) },
  { id: 'camp-3', name: 'QR Code Launch', sourceType: 'QR_CODE', offer: '10% off first month', active: true, _count: { leads: 56 }, createdAt: randomDate(20) },
  { id: 'camp-4', name: 'Holiday Special', sourceType: 'SOCIAL_MEDIA', offer: 'Bundle deal', active: false, _count: { leads: 203 }, createdAt: randomDate(90) },
  { id: 'camp-5', name: 'Partner Webinar', sourceType: 'FORM', offer: 'Free ebook', active: true, _count: { leads: 34 }, createdAt: randomDate(15) },
];

export const mockTasks = [
  { id: 'task-1', title: 'Follow up with Emma Johnson', description: 'Send pricing proposal', status: 'PENDING', priority: 'HIGH', dueAt: randomDate(1), lead: { contact: { name: 'Emma Johnson' } }, createdAt: randomDate(3) },
  { id: 'task-2', title: 'Prepare demo for NovaTech', description: 'Set up personalized walkthrough', status: 'IN_PROGRESS', priority: 'HIGH', dueAt: randomDate(2), lead: { contact: { name: 'Liam Williams' } }, createdAt: randomDate(5) },
  { id: 'task-3', title: 'Send proposal to Summit Digital', description: 'Include case studies', status: 'PENDING', priority: 'MEDIUM', dueAt: randomDate(4), lead: { contact: { name: 'Olivia Brown' } }, createdAt: randomDate(7) },
  { id: 'task-4', title: 'Call back Sophia Miller', description: 'Discuss enterprise plan', status: 'COMPLETED', priority: 'LOW', dueAt: randomDate(1), lead: { contact: { name: 'Sophia Miller' } }, createdAt: randomDate(10) },
  { id: 'task-5', title: 'Review contract terms', description: 'Check with legal team', status: 'PENDING', priority: 'HIGH', dueAt: randomDate(3), lead: { contact: { name: 'Mason Davis' } }, createdAt: randomDate(4) },
];

export const mockConversions = [
  { id: 'conv-1', leadId: 'lead-5', stage: 'Won', value: 2500, dealName: 'BrightPath Annual Plan', contactName: 'Emma Johnson', createdAt: randomDate(10) },
  { id: 'conv-2', leadId: 'lead-12', stage: 'Negotiation', value: 5000, dealName: 'NovaTech Enterprise', contactName: 'Liam Williams', createdAt: randomDate(5) },
  { id: 'conv-3', leadId: 'lead-8', stage: 'Won', value: 12000, dealName: 'Summit Digital Suite', contactName: 'Olivia Brown', createdAt: randomDate(20) },
  { id: 'conv-4', leadId: 'lead-3', stage: 'Proposal Sent', value: 3500, dealName: 'Pinnacle Growth Plan', contactName: 'Noah Jones', createdAt: randomDate(3) },
  { id: 'conv-5', leadId: 'lead-15', stage: 'Qualified', value: 8000, dealName: 'Horizon Media Platform', contactName: 'Mia Garcia', createdAt: randomDate(7) },
];

export const mockTemplates = [
  { id: 'tmpl-1', name: 'Welcome Message', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! Thanks for reaching out. How can we help you today?', variables: ['contact.name'], version: 1, active: true },
  { id: 'tmpl-2', name: 'Follow-up Email', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, just checking in. Have you had a chance to review our proposal?', variables: ['contact.name'], version: 2, active: true },
  { id: 'tmpl-3', name: 'Booking Reminder', type: 'REMINDER', channel: 'WHATSAPP', body: 'Reminder: You have a call scheduled with {{business.name}} tomorrow at {{time}}.', variables: ['business.name', 'time'], version: 1, active: true },
  { id: 'tmpl-4', name: 'Thank You', type: 'THANK_YOU', channel: 'EMAIL', body: 'Thanks {{contact.name}}! We look forward to working with you.', variables: ['contact.name'], version: 1, active: false },
];

export const mockNurtureSequences = [
  {
    id: 'seq-1', name: 'Welcome Flow', leadList: 'all', active: true, createdAt: randomDate(30),
    steps: [
      { id: 'step-1', type: 'SEND_WHATSAPP', config: { templateId: 'tmpl-1' }, order: 0 },
      { id: 'step-2', type: 'WAIT', config: { duration: '24h' }, order: 1 },
      { id: 'step-3', type: 'SEND_EMAIL', config: { templateId: 'tmpl-2' }, order: 2 },
      { id: 'step-4', type: 'CHECK_CONDITION', config: { condition: 'lead.opened_email' }, order: 3 },
    ],
  },
  {
    id: 'seq-2', name: 'Hot Lead Follow-up', leadList: 'hot_leads', active: true, createdAt: randomDate(15),
    steps: [
      { id: 'step-5', type: 'SEND_WHATSAPP', config: { templateId: 'tmpl-3' }, order: 0 },
      { id: 'step-6', type: 'CREATE_TASK', config: { assignee: 'sarah@leadauto.com' }, order: 1 },
    ],
  },
];

export const mockScoringRules = [
  { id: 'sr-1', name: 'Email Open', field: 'email.opened', operator: 'equals', value: 'true', points: 10, active: true },
  { id: 'sr-2', name: 'WhatsApp Reply', field: 'whatsapp.replied', operator: 'equals', value: 'true', points: 15, active: true },
  { id: 'sr-3', name: 'High Budget', field: 'lead.budget', operator: 'greater_than', value: '10000', points: 25, active: true },
  { id: 'sr-4', name: 'Demo Requested', field: 'lead.requested_demo', operator: 'equals', value: 'true', points: 20, active: true },
];

export const mockRoutingRules = [
  { id: 'rr-1', name: 'High Score → Senior Rep', conditions: { field: 'score', operator: 'gte', value: 80 }, action: { assignTo: 'senior_team' }, active: true, createdAt: randomDate(30) },
  { id: 'rr-2', name: 'Hot Leads → Immediate Call', conditions: { field: 'segment', operator: 'equals', value: 'HOT' }, action: { assignTo: 'priority_queue' }, active: true, createdAt: randomDate(20) },
  { id: 'rr-3', name: 'Budget > $10K → Enterprise', conditions: { field: 'budget', operator: 'gte', value: '10000' }, action: { assignTo: 'enterprise_team' }, active: false, createdAt: randomDate(10) },
];

export const mockIntegrations = [
  { id: 'int-1', name: 'Slack Notifications', type: 'slack', status: 'CONNECTED', config: { channel: '#leads' }, lastTested: randomDate(2) },
  { id: 'int-2', name: 'Google Sheets Export', type: 'google_sheets', status: 'CONNECTED', config: { sheetId: '1abc123' }, lastTested: randomDate(5) },
  { id: 'int-3', name: 'Zapier Webhook', type: 'webhook', status: 'DISCONNECTED', config: { url: 'https://hooks.zapier.com/...' }, lastTested: randomDate(30) },
  { id: 'int-4', name: 'HubSpot CRM', type: 'hubspot', status: 'PENDING', config: {}, lastTested: null },
];

export const mockCRMMappings = [
  { id: 'crm-1', name: 'HubSpot Sync', crmType: 'hubspot', fieldMappings: { name: 'firstname', email: 'email', phone: 'phone' }, active: true },
  { id: 'crm-2', name: 'Salesforce Sync', crmType: 'salesforce', fieldMappings: { name: 'FirstName', email: 'Email', company: 'Company' }, active: false },
];

export const mockBookingSettings = [
  { id: 'book-1', name: 'Calendly Integration', provider: 'calendly', config: { url: 'https://calendly.com/leadauto-demo' }, active: true },
  { id: 'book-2', name: 'Google Calendar', provider: 'google_calendar', config: { calendarId: 'primary' }, active: false },
];

export const mockPipelineStages = [
  { id: 'stage-1', name: 'New', order: 0, color: '#3b82f6', isDefault: true, isEnd: false },
  { id: 'stage-2', name: 'Contacted', order: 1, color: '#f59e0b', isDefault: false, isEnd: false },
  { id: 'stage-3', name: 'Qualified', order: 2, color: '#8b5cf6', isDefault: false, isEnd: false },
  { id: 'stage-4', name: 'Proposal', order: 3, color: '#f97316', isDefault: false, isEnd: false },
  { id: 'stage-5', name: 'Negotiation', order: 4, color: '#ec4899', isDefault: false, isEnd: false },
  { id: 'stage-6', name: 'Won', order: 5, color: '#10b981', isDefault: false, isEnd: true },
  { id: 'stage-7', name: 'Lost', order: 6, color: '#ef4444', isDefault: false, isEnd: true },
];

export const mockUsers = [
  { id: 'user-1', name: 'Admin User', email: 'admin@leadauto.com', role: 'SUPER_ADMIN', active: true, createdAt: randomDate(90) },
  { id: 'user-2', name: 'Sarah Chen', email: 'sarah@leadauto.com', role: 'AGENT', active: true, createdAt: randomDate(60) },
  { id: 'user-3', name: 'Marcus Rivera', email: 'marcus@leadauto.com', role: 'AGENT', active: true, createdAt: randomDate(45) },
  { id: 'user-4', name: 'Priya Patel', email: 'priya@leadauto.com', role: 'MANAGER', active: true, createdAt: randomDate(30) },
  { id: 'user-5', name: 'Alex Kim', email: 'alex@leadauto.com', role: 'AGENT', active: false, createdAt: randomDate(20) },
];

export const mockAuditLogs = [
  { id: 'log-1', action: 'USER_LOGIN', userId: 'user-1', details: 'Admin logged in', ip: '192.168.1.100', createdAt: randomDate(1) },
  { id: 'log-2', action: 'LEAD_CREATED', userId: 'user-2', details: 'Created lead for Emma Johnson', ip: '192.168.1.101', createdAt: randomDate(1) },
  { id: 'log-3', action: 'CAMPAIGN_PAUSED', userId: 'user-1', details: 'Paused Holiday Special campaign', ip: '192.168.1.100', createdAt: randomDate(2) },
  { id: 'log-4', action: 'INTEGRATION_TESTED', userId: 'user-3', details: 'Tested Slack integration', ip: '192.168.1.102', createdAt: randomDate(3) },
  { id: 'log-5', action: 'SETTINGS_UPDATED', userId: 'user-4', details: 'Updated business hours', ip: '192.168.1.103', createdAt: randomDate(4) },
  { id: 'log-6', action: 'RULE_CREATED', userId: 'user-1', details: 'Created scoring rule: High Budget', ip: '192.168.1.100', createdAt: randomDate(5) },
  { id: 'log-7', action: 'USER_CREATED', userId: 'user-1', details: 'Created user: Alex Kim', ip: '192.168.1.100', createdAt: randomDate(10) },
];

export const mockAutomationRules = [
  { id: 'ar-1', name: 'Auto-assign Hot Leads', category: 'assignment', eventType: 'lead.created', priority: 1, conditions: [{ field: 'segment', operator: 'equals', value: 'HOT' }], actions: [{ type: 'assign_agent', config: { team: 'senior' } }], active: true },
  { id: 'ar-2', name: 'Send Welcome on Capture', category: 'communication', eventType: 'lead.created', priority: 2, conditions: [{ field: 'source', operator: 'equals', value: 'FORM' }], actions: [{ type: 'send_message', config: { template: 'tmpl-1' } }], active: true },
  { id: 'ar-3', name: 'Escalate Unresponsive Leads', category: 'assignment', eventType: 'lead.inactive', priority: 3, conditions: [{ field: 'last_contact', operator: 'gt', value: '72h' }], actions: [{ type: 'change_segment', config: { segment: 'COLD' } }], active: false },
];

export const mockBlocklist = [
  { id: 'bl-1', phone: '+1 (555) 123-4567', reason: 'Spam', blockedAt: randomDate(30) },
  { id: 'bl-2', email: 'bounce@spam.com', reason: 'Hard bounce', blockedAt: randomDate(20) },
];

export const mockSLARules = [
  { id: 'sla-1', name: 'Hot Lead Response', condition: 'segment=HOT', responseTime: 5, unit: 'minutes', escalation: true, active: true },
  { id: 'sla-2', name: 'Standard Response', condition: 'segment=WARM', responseTime: 60, unit: 'minutes', escalation: false, active: true },
];

export const mockRevenue = {
  total: 284500, monthly: { current: 45200, previous: 38900, growth: 16.2 },
  bySource: [
    { source: 'CAMPAIGN', amount: 120000 }, { source: 'QR_CODE', amount: 45000 },
    { source: 'FORM', amount: 68000 }, { source: 'CHATBOT', amount: 31500 }, { source: 'WHATSAPP', amount: 20000 },
  ],
};

export const mockBusinessSettings = {
  businessName: 'LeadAuto', timezone: 'America/New_York', workingHours: { start: '09:00', end: '18:00' },
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  emailSignature: 'Best regards,\nThe LeadAuto Team',
  language: 'en', currency: 'USD',
};

export const mockForms = [
  { id: 'form-1', name: 'Contact Us', type: 'EMBEDDED', active: true, _count: { submissions: 234 }, createdAt: randomDate(45), fields: [{ name: 'name', type: 'text', required: true }, { name: 'email', type: 'email', required: true }, { name: 'phone', type: 'phone', required: false }] },
  { id: 'form-2', name: 'Newsletter Signup', type: 'POPUP', active: true, _count: { submissions: 567 }, createdAt: randomDate(30), fields: [{ name: 'email', type: 'email', required: true }] },
  { id: 'form-3', name: 'Feedback Survey', type: 'EMBEDDED', active: false, _count: { submissions: 89 }, createdAt: randomDate(60), fields: [{ name: 'rating', type: 'number', required: true }, { name: 'comments', type: 'textarea', required: false }] },
];

export const mockQRCodes = [
  { id: 'qr-1', name: 'Store Front Display', url: 'https://leadauto.com/scan/store', scans: 345, active: true, createdAt: randomDate(45) },
  { id: 'qr-2', name: 'Business Card', url: 'https://leadauto.com/scan/card', scans: 189, active: true, createdAt: randomDate(30) },
  { id: 'qr-3', name: 'Flyer Summer Campaign', url: 'https://leadauto.com/scan/summer', scans: 567, active: true, createdAt: randomDate(20) },
  { id: 'qr-4', name: 'Event Banner', url: 'https://leadauto.com/scan/event', scans: 78, active: false, createdAt: randomDate(60) },
];

export const mockMedia = [
  { id: 'med-1', name: 'hero-banner.jpg', type: 'IMAGE', size: 245000, url: '/media/hero-banner.jpg', createdAt: randomDate(30) },
  { id: 'med-2', name: 'product-demo.mp4', type: 'VIDEO', size: 2500000, url: '/media/product-demo.mp4', createdAt: randomDate(25) },
  { id: 'med-3', name: 'logo-white.svg', type: 'IMAGE', size: 12000, url: '/media/logo-white.svg', createdAt: randomDate(20) },
  { id: 'med-4', name: 'pricing-sheet.pdf', type: 'DOCUMENT', size: 480000, url: '/media/pricing-sheet.pdf', createdAt: randomDate(15) },
];

export const mockContacts = [
  { id: 'c-1', name: 'Emma Johnson', email: 'emma.johnson@brightpath.com', phone: '+1 (212) 555-0147', company: 'BrightPath Solutions', location: 'New York, NY', tags: ['vip'], createdAt: randomDate(60), _count: { leads: 3 } },
  { id: 'c-2', name: 'Liam Williams', email: 'liam.williams@novatech.com', phone: '+1 (310) 555-0283', company: 'NovaTech Industries', location: 'Los Angeles, CA', tags: [], createdAt: randomDate(45), _count: { leads: 2 } },
  { id: 'c-3', name: 'Olivia Brown', email: 'olivia.brown@summitdigital.com', phone: '+1 (312) 555-0391', company: 'Summit Digital', location: 'Chicago, IL', tags: ['hot'], createdAt: randomDate(30), _count: { leads: 1 } },
];

const mockResponseMap: Record<string, () => any> = {
  '/analytics/overview': () => mockAnalytics,
  '/analytics/sources': () => mockAnalyticsSources,
  '/analytics/agents': () => mockAnalyticsAgents,
  '/health': () => mockHealth,
  '/health/deep': () => ({ ...mockHealth, dependencies: { database: { status: 'connected', latencyMs: 12 }, redis: { status: 'connected', latencyMs: 3 } } }),
  '/failures': () => mockFailures,
  '/failures/open': () => mockFailures.filter(f => f.status === 'OPEN'),
  '/campaigns': () => ({ data: mockCampaigns, meta: { total: mockCampaigns.length, page: 1, limit: 20 } }),
  '/ai/campaigns': () => ({ data: mockAICampaigns, meta: { total: mockAICampaigns.length } }),
  '/tasks': () => ({ data: mockTasks, meta: { total: mockTasks.length, page: 1, limit: 20 } }),
  '/conversations': () => ({ data: mockMessages, meta: { total: mockMessages.length } }),
  '/message-templates': () => mockTemplates,
  '/nurture-sequences': () => ({ data: mockNurtureSequences, meta: { total: mockNurtureSequences.length } }),
  '/scoring-rules': () => ({ data: mockScoringRules, meta: { total: mockScoringRules.length } }),
  '/routing-rules': () => ({ data: mockRoutingRules, meta: { total: mockRoutingRules.length } }),
  '/integrations': () => ({ data: mockIntegrations, meta: { total: mockIntegrations.length } }),
  '/crm-mappings': () => ({ data: mockCRMMappings, meta: { total: mockCRMMappings.length } }),
  '/booking-settings': () => ({ data: mockBookingSettings, meta: { total: mockBookingSettings.length } }),
  '/pipeline-stages': () => mockPipelineStages,
  '/conversions': () => ({ data: mockConversions, summary: { rate: '15.2%', total: mockConversions.length, revenue: 31000 } }),
  '/users': () => mockUsers,
  '/audit-logs': () => ({ data: mockAuditLogs, meta: { total: mockAuditLogs.length } }),
  '/rules': () => mockAutomationRules,
  '/blocklist': () => mockBlocklist,
  '/sla-rules': () => mockSLARules,
  '/revenue': () => mockRevenue,
  '/business-settings': () => mockBusinessSettings,
  '/forms': () => mockForms,
  '/qr-codes': () => mockQRCodes,
  '/media': () => ({ data: mockMedia, meta: { total: mockMedia.length } }),
  '/contacts': () => ({ data: mockContacts, meta: { total: mockContacts.length, page: 1, limit: 20 } }),
  '/leads': () => ({ data: mockLeads, meta: { total: mockLeads.length, page: 1, limit: 20 } }),
};

export const mockAICampaigns: AICampaignDraft[] = [
  {
    id: 'ai-camp-1',
    prompt: 'Diwali campaign targeting hot leads in Bangalore',
    preview: {
      name: 'Diwali Festive Offer — Bangalore',
      segment: { filters: [{ field: 'segment', operator: 'equals', value: 'HOT' }, { field: 'location', operator: 'contains', value: 'Bangalore' }], estimatedLeads: 47 },
      channels: ['WHATSAPP', 'SMS'],
      message: '🪔 Happy Diwali from [Business Name]! ✨\n\nAs our valued customer, we have a special surprise for you — exclusive Diwali discounts on our premium packages.\n\n✨ Flat 25% OFF on all plans\n🎁 Free consultation worth ₹2,499\n📅 Limited period: Nov 10-15\n\nReply "YES" to claim your offer or visit: [Link]\n\nWishing you and your family a prosperous Diwali! 🌟',
      schedule: { start: '2026-11-10T09:00:00Z', end: '2026-11-15T21:00:00Z', timezone: 'Asia/Kolkata' },
      budget: 50000,
      predictedROI: '12-15x',
    },
    status: 'draft',
    createdAt: randomDate(3),
  },
  {
    id: 'ai-camp-2',
    prompt: 'Follow-up campaign for leads who opened but didn\'t reply',
    preview: {
      name: 'Gentle Reminder — No Reply Follow-up',
      segment: { filters: [{ field: 'last_action', operator: 'equals', value: 'opened' }, { field: 'replied', operator: 'equals', value: 'false' }], estimatedLeads: 123 },
      channels: ['EMAIL'],
      message: 'Subject: Still thinking about it? 👋\n\nHi {{contact.name}},\n\nNoticed you checked out our offer — wanted to see if you had any questions.\n\nHere\'s a quick summary:\n✅ [Key Benefit 1]\n✅ [Key Benefit 2]\n✅ [Key Benefit 3]\n\nReply to this email or book a quick 10-min call: [Calendar Link]\n\nCheers,\n[Your Name]',
      schedule: { start: new Date().toISOString(), end: new Date(Date.now() + 7 * 86400000).toISOString(), timezone: 'Asia/Kolkata' },
      budget: 0,
      predictedROI: '8-10x',
    },
    status: 'launched',
    createdAt: randomDate(7),
  },
  {
    id: 'ai-camp-3',
    prompt: 'WhatsApp broadcast for new property listing in Whitefield',
    preview: {
      name: 'New Launch — Whitefield Luxury Apartments',
      segment: { filters: [{ field: 'interest', operator: 'contains', value: 'property' }, { field: 'budget', operator: 'gte', value: '50000' }], estimatedLeads: 89 },
      channels: ['WHATSAPP'],
      message: '🏢 New Launch Alert! Premium Apartments in Whitefield\n\n[Business Name] presents:\n🌳 2/3 BHK Luxury Apartments\n📍 Whitefield, Bangalore\n\n✨ Starting at ₹75L\n🏊 Swimming Pool, Clubhouse, Gym\n🚇 500m from Metro\n🔑 Ready-to-move: Dec 2026\n\nInterested? Reply "YES" for a free site visit + brochure 📄\n\nLimited units available!',
      schedule: { start: new Date().toISOString(), end: new Date(Date.now() + 30 * 86400000).toISOString(), timezone: 'Asia/Kolkata' },
      budget: 35000,
      predictedROI: '20-25x',
    },
    status: 'draft',
    createdAt: randomDate(1),
  },
];

function detectIntent(prompt: string): { intent: string; channels: string[]; targets: string; message: string; name: string } {
  const lower = prompt.toLowerCase();
  if (lower.includes('diwali') || lower.includes('festival') || lower.includes('festive')) {
    return {
      intent: 'festive_offer',
      channels: ['WHATSAPP', 'SMS'],
      targets: lower.includes('bangalore') ? 'HOT leads in Bangalore' : 'all active leads',
      message: `🪔 Exclusive Festive Offer Just for You! ✨\n\nHi {{contact.name}},\n\n[Business Name] has a special festive surprise! 🎁\n\n✨ Flat 25% OFF on all plans\n🎁 Free consultation worth ₹2,499\n📅 Limited period offer\n\nReply "YES" to claim or visit: [Link]\n\nWishing you and your family a wonderful festive season! 🌟`,
      name: lower.includes('bangalore') ? 'Festive Offer — Bangalore' : 'Festive Campaign',
    };
  }
  if (lower.includes('follow') || lower.includes('reminder') || lower.includes('no reply') || lower.includes('didn\'t reply')) {
    return {
      intent: 'follow_up',
      channels: ['EMAIL'],
      targets: 'leads who opened but didn\'t reply',
      message: `Subject: Still thinking? 👋\n\nHi {{contact.name}},\n\nNoticed you checked out our offer — just wanted to see if you had any questions.\n\nHere's a quick recap:\n✅ [Key Benefit 1]\n✅ [Key Benefit 2]\n✅ [Key Benefit 3]\n\nBook a quick call: [Calendar Link]\n\nCheers,\n[Your Name]`,
      name: 'Follow-up — No Reply',
    };
  }
  if (lower.includes('whatsapp') || lower.includes('broadcast')) {
    return {
      intent: 'whatsapp_broadcast',
      channels: ['WHATSAPP'],
      targets: lower.includes('property') || lower.includes('listing') ? 'leads interested in property' : 'all engaged leads',
      message: `🚀 Exciting News from [Business Name]!\n\nHi {{contact.name}},\n\nWe have something special for you!\n\n${lower.includes('whitefield') ? '📍 Whitefield, Bangalore\n🏢 Luxury 2/3 BHK Apartments\n✨ Starting at ₹75L\n🔑 Ready-to-move Dec 2026' : '✨ Exclusive offer just for you\n🎯 Limited time deal\n💥 Don\'t miss out!'}\n\nReply "YES" to know more or visit: [Link]\n\n— Team [Business Name]`,
      name: lower.includes('property') ? 'Property Broadcast — WhatsApp' : 'WhatsApp Broadcast',
    };
  }
  if (lower.includes('re-engage') || lower.includes('win back') || lower.includes('cold') || lower.includes('inactive')) {
    return {
      intent: 're_engagement',
      channels: ['SMS', 'EMAIL'],
      targets: 'inactive/cold leads (no activity in 30+ days)',
      message: `We miss you! 💙\n\nHi {{contact.name}},\n\nIt's been a while! We'd love to welcome you back with a special offer:\n\n🎁 Exclusive "Welcome Back" discount\n⏰ Limited time only\n\nVisit: [Link] or reply to this message.\n\n— [Business Name]`,
      name: 'Re-engagement — Cold Leads',
    };
  }
  return {
    intent: 'general_promotion',
    channels: lower.includes('whatsapp') ? ['WHATSAPP'] : lower.includes('email') ? ['EMAIL'] : ['SMS', 'WHATSAPP'],
    targets: lower.includes('hot') ? 'HOT leads' : lower.includes('warm') ? 'WARM leads' : 'all active leads',
    message: `Hi {{contact.name}}! 👋\n\n[Business Name] here with a special update just for you.\n\n${prompt.includes('offer') || prompt.includes('discount') ? '🎉 Exclusive offer: Limited time discount!\n⏰ Act fast — this won\'t last long!' : '✨ Check out what\'s new:\n📌 Latest updates and offers\n💡 Tailored just for you'}\n\nReply "YES" or visit: [Link]\n\n— Team [Business Name]`,
    name: prompt.slice(0, 40) + (prompt.length > 40 ? '...' : ''),
  };
}

function generateAICampaign(prompt: string) {
  const { intent, channels, targets, message, name } = detectIntent(prompt);
  return {
    id: `ai-camp-${Date.now()}`,
    prompt,
    preview: {
      name,
      segment: {
        filters: [{ field: 'segment', operator: 'equals', value: targets.includes('HOT') ? 'HOT' : targets.includes('WARM') ? 'WARM' : 'ALL' }],
        estimatedLeads: randomInt(30, 200),
      },
      channels,
      message,
      schedule: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 14 * 86400000).toISOString(),
        timezone: 'Asia/Kolkata',
      },
      budget: intent === 'festive_offer' ? randomInt(25000, 75000) : intent === 'whatsapp_broadcast' ? randomInt(15000, 50000) : randomInt(0, 15000),
      predictedROI: `${randomInt(5, 25)}-${randomInt(12, 40)}x`,
    },
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

export function getMockResponse(path: string, method: string, body?: any): any | null {
  const normalized = path.split('?')[0];
  const handler = mockResponseMap[normalized];
  if (handler && method === 'GET') return handler();

  if (normalized.startsWith('/leads/') && normalized.endsWith('/timeline') && method === 'GET') {
    const leadId = normalized.split('/')[2];
    return getMockTimeline(leadId);
  }

  if (normalized.startsWith('/leads') && method === 'GET') {
    return { data: mockLeads, meta: { total: mockLeads.length, page: 1, limit: 20 } };
  }

  if (normalized.startsWith('/leads/') && method === 'GET') {
    const id = normalized.split('/')[2];
    return mockLeads.find(l => l.id === id) || mockLeads[0];
  }

  if (method === 'POST') {
    if (normalized.startsWith('/rules/test')) return { matched: true, score: 75 };
    if (normalized.startsWith('/message-templates') && normalized.endsWith('/preview')) {
      return { preview: 'Mock preview of the template with your variables.' };
    }
    if (normalized.endsWith('/ai/campaigns/generate')) {
      return generateAICampaign(body?.prompt || '');
    }
    return { success: true, id: `mock-${Date.now()}` };
  }

  if (method === 'PATCH') {
    return { success: true };
  }

  if (method === 'DELETE') {
    return { success: true };
  }

  return null;
}
