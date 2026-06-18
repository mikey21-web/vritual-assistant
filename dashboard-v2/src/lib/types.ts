export type LeadStatus = 'NEW' | 'CONTACTED' | 'ENGAGED' | 'QUALIFYING' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'APPOINTMENT_BOOKED' | 'CONVERTED' | 'LOST' | 'COLD' | 'SPAM';
export type LeadSegment = 'HOT' | 'WARM' | 'COLD' | 'UNQUALIFIED' | 'EXISTING_CUSTOMER' | 'RECONNECT';
export type LeadSource = 'CAMPAIGN' | 'QR_CODE' | 'FORM' | 'CHATBOT' | 'MOBILE_APP' | 'WHATSAPP' | 'SOCIAL_MEDIA' | 'PHONE_CALL';

export interface Lead {
  id: string;
  status: LeadStatus;
  segment: LeadSegment;
  source: LeadSource;
  score: number;
  priority: number;
  interest?: string;
  budget?: string;
  urgency?: string;
  message?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  campaignId?: string;
  assignedAgentId?: string;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  assignedAgent?: { id: string; name: string; email: string };
  campaign?: { id: string; name: string };
  conversations?: any[];
  conversions?: any[];
  tasks?: any[];
  _count?: { conversations: number; conversions: number; tasks: number };
}

export interface Contact {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  company?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  _count?: { leads: number };
}

export interface Campaign {
  id: string;
  name: string;
  sourceType: string;
  offer?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  _count?: { leads: number };
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueAt?: string;
  leadId?: string;
  assigneeId?: string;
  lead?: { contact?: { name?: string } };
  assignee?: { id: string; name: string };
  createdAt: string;
}

export interface Message {
  id: string;
  text: string;
  channel: string;
  direction: string;
  leadId: string;
  contactId?: string;
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  channel: string;
  body: string;
  variables: string[];
  version: number;
  active: boolean;
}

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  config?: Record<string, unknown>;
  lastTested?: string;
}

export interface BookingSetting {
  id: string;
  name: string;
  provider: string;
  config?: Record<string, unknown>;
  active: boolean;
}

export interface CrmMapping {
  id: string;
  name: string;
  crmType: string;
  fieldMappings?: Record<string, unknown>;
  active: boolean;
}

export interface ScoringRule {
  id: string;
  name: string;
  field: string;
  operator: string;
  value: string;
  points: number;
  active: boolean;
}

export interface RoutingRule {
  id: string;
  name: string;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  active: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  category: string;
  eventType?: string;
  priority: number;
  conditions: any[];
  actions: any[];
  active: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isDefault: boolean;
  isEnd: boolean;
}

export interface FailureRecord {
  id: string;
  type: string;
  status: string;
  severity: string;
  message: string;
  leadId?: string;
  provider?: string;
  operation?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
}

export interface NicheTemplate {
  id: string;
  key: string;
  name: string;
  industry: string;
  version: number;
  status: string;
  _count: { packs: number };
}

export interface Tenant {
  id: string;
  key: string;
  name: string;
  industry: string;
  status: string;
  contactEmail?: string;
  contactName?: string;
  createdAt: string;
  _count: { users: number; leads: number; campaigns: number };
  installations: { template: { key: string; name: string; industry: string } }[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export interface HealthReport {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
  dependencies: Record<string, { status: string; latencyMs?: number; detail?: string }>;
}

export interface AnalyticsOverview {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  converted: number;
  lost: number;
  conversionRate: string;
}

export type NavigationPage = 
  | 'Overview' | 'Leads' | 'Contacts' | 'Campaigns' | 'Forms' | 'QR Codes'
  | 'Messages' | 'Templates' | 'Media' | 'Nurture' | 'Scoring' | 'Routing'
  | 'Tasks' | 'Conversions' | 'Integrations' | 'CRM' | 'Booking' | 'Analytics'
  | 'Team' | 'Audit Logs' | 'Advanced' | 'Settings' | 'Clients' | 'Niche Templates'
  | 'Client Workspace' | 'Failures' | 'Health';
