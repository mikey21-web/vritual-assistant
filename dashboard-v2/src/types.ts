/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type NavigationPage = 
  | 'Overview' | 'Leads' | 'Contacts' | 'Campaigns' | 'Forms' | 'QR Codes'
  | 'Messages' | 'Templates' | 'Media' | 'Nurture' | 'Scoring' | 'Routing'
  | 'Tasks' | 'Conversions' | 'Integrations' | 'CRM' | 'Booking' | 'Analytics'
  | 'Team' | 'Audit Logs' | 'Advanced' | 'Settings' | 'Clients' | 'Niche Templates'
  | 'Client Workspace';

export type NavCategory = 
  | 'Dashboard'
  | 'Acquisition'
  | 'Outreach'
  | 'Automation'
  | 'Integrations & Intel'
  | 'Operations'
  | 'Client Hub';

export interface NavItem {
  id: NavigationPage;
  label: string;
  category: NavCategory;
  badge?: string;
  count?: number;
}

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Nurturing' | 'Closed-Won' | 'Closed-Lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  campaignName: string;
  status: LeadStatus;
  value: number;
  source: 'Google Ads' | 'Meta' | 'Organic Search' | 'Referral' | 'LinkedIn' | 'Cold Outreach' | 'API Gateway';
  dateCreated: string;
  avatarColor: string;
  notes?: string;
  lastContacted?: string;
  tags?: string[];
  countryOrCity?: string;
}

export type CampaignStatus = 'Active' | 'Paused' | 'Completed' | 'Draft';
export type CampaignChannel = 'Email' | 'SMS' | 'LinkedIn' | 'Ad Campaign' | 'Unified Voice';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  leadsCount: number;
  conversionRate: number; // percentage
  spend: number;
  budget: number;
  description: string;
  lastActive: string;
}

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'lead_in' | 'campaign_trigger' | 'automation' | 'system_alert';
}

export interface SystemStatus {
  service: string;
  status: 'operational' | 'nominal' | 'degraded';
  latency: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  criterion: 'source' | 'score';
  operator: 'equals' | 'greater_than' | 'less_than';
  value: string;
  assignee: string;
  isActive: boolean;
}

export interface PlatformSettings {
  companyName: string;
  senderEmail: string;
  apiKey: string;
  dailyLeadLimit: number;
  enableRouting: boolean;
  scoringThreshold: number;
  slackWebhook: string;
  timezone: string;
  routingRules?: RoutingRule[];
}
