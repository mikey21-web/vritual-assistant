/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, Campaign, ActivityLog, SystemStatus, PlatformSettings } from './types';

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'L-9041',
    name: 'Sarah Jenkins',
    email: 'sarah.j@apexcorp.io',
    phone: '+1 (555) 234-9081',
    campaignName: 'Q2 Executive Outreach',
    status: 'New',
    value: 5400,
    source: 'LinkedIn',
    dateCreated: '2026-06-13T10:14:00Z',
    avatarColor: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: 'L-9040',
    name: 'Marcus Vance',
    email: 'm.vance@vanguard-tech.com',
    phone: '+1 (555) 890-4122',
    campaignName: 'Inbound Demo Request',
    status: 'Qualified',
    value: 12000,
    source: 'Google Ads',
    dateCreated: '2026-06-13T09:45:00Z',
    avatarColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'L-9039',
    name: 'Aiden Gallagher',
    email: 'a.gallagher@lumina.dev',
    phone: '+1 (555) 345-8910',
    campaignName: 'Developer Relations v3',
    status: 'Contacted',
    value: 3600,
    source: 'Organic Search',
    dateCreated: '2026-06-12T18:30:00Z',
    avatarColor: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'L-9038',
    name: 'Elena Rostova',
    email: 'elena.r@novasystems.eu',
    phone: '+33 4 91 57 01 22',
    campaignName: 'EU Expansion Webinar',
    status: 'Nurturing',
    value: 9500,
    source: 'Cold Outreach',
    dateCreated: '2026-06-12T14:15:00Z',
    avatarColor: 'bg-amber-100 text-amber-800'
  },
  {
    id: 'L-9037',
    name: 'David Kim',
    email: 'david.kim@prism-industries.kr',
    phone: '+82 2-312-4567',
    campaignName: 'Q2 Executive Outreach',
    status: 'Closed-Won',
    value: 18500,
    source: 'LinkedIn',
    dateCreated: '2026-06-11T21:05:00Z',
    avatarColor: 'bg-teal-100 text-teal-800'
  },
  {
    id: 'L-9036',
    name: 'Olivia Sterling',
    email: 'o.sterling@broadway.net',
    phone: '+1 (555) 789-1234',
    campaignName: 'Inbound Demo Request',
    status: 'Closed-Lost',
    value: 4800,
    source: 'Meta',
    dateCreated: '2026-06-11T11:40:00Z',
    avatarColor: 'bg-rose-100 text-rose-800'
  },
  {
    id: 'L-9035',
    name: 'Jonathan Reynolds',
    email: 'jreynolds@vector-space.co',
    phone: '+1 (555) 231-6789',
    campaignName: 'SaaS Playbook Download',
    status: 'Qualified',
    value: 8200,
    source: 'Organic Search',
    dateCreated: '2026-06-10T16:22:00Z',
    avatarColor: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: 'L-9034',
    name: 'Sofia Al-Fayed',
    email: 'saf@gulfstream-hld.com',
    phone: '+971 4 301 2234',
    campaignName: 'MENA Enterprise Launch',
    status: 'New',
    value: 24000,
    source: 'Referral',
    dateCreated: '2026-06-10T08:12:00Z',
    avatarColor: 'bg-cyan-100 text-cyan-800'
  },
  {
    id: 'L-9033',
    name: 'Thomas Mull',
    email: 'tmull@quantum-scale.com',
    phone: '+1 (555) 456-7890',
    campaignName: 'Developer Relations v3',
    status: 'Contacted',
    value: 1500,
    source: 'API Gateway',
    dateCreated: '2026-06-09T15:55:00Z',
    avatarColor: 'bg-sky-100 text-sky-800'
  },
  {
    id: 'L-9032',
    name: 'Rachel Greene',
    email: 'rachelg@central-p.io',
    phone: '+1 (555) 987-6543',
    campaignName: 'SaaS Playbook Download',
    status: 'Nurturing',
    value: 6200,
    source: 'Meta',
    dateCreated: '2026-06-08T13:40:00Z',
    avatarColor: 'bg-pink-100 text-pink-800'
  },
  {
    id: 'L-9031',
    name: 'Devin Cole',
    email: 'dcole@stellaris.org',
    phone: '+1 (555) 321-4567',
    campaignName: 'Inbound Demo Request',
    status: 'Closed-Won',
    value: 15500,
    source: 'Google Ads',
    dateCreated: '2026-06-08T10:11:00Z',
    avatarColor: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: 'L-9030',
    name: 'Hana Tanaka',
    email: 'h.tanaka@tokyo-banc.jp',
    phone: '+81 3-5555-0199',
    campaignName: 'APAC Executive Event',
    status: 'Qualified',
    value: 29000,
    source: 'LinkedIn',
    dateCreated: '2026-06-07T09:04:00Z',
    avatarColor: 'bg-orange-100 text-orange-800'
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'CMP-701',
    name: 'Q2 Executive Outreach',
    status: 'Active',
    channel: 'LinkedIn',
    leadsCount: 1420,
    conversionRate: 8.4,
    spend: 4200,
    budget: 8000,
    description: 'Highly customized text-inmail sequences targeting VP-level sales executives in North American B2B tech platforms.',
    lastActive: 'Just now'
  },
  {
    id: 'CMP-702',
    name: 'Inbound Demo Request',
    status: 'Active',
    channel: 'Ad Campaign',
    leadsCount: 890,
    conversionRate: 15.2,
    spend: 9600,
    budget: 15000,
    description: 'High-intent search engine ads promoting our instant setup and unified API triggers for Lead Auto platforms.',
    lastActive: '2 min ago'
  },
  {
    id: 'CMP-703',
    name: 'Developer Relations v3',
    status: 'Active',
    channel: 'Email',
    leadsCount: 2450,
    conversionRate: 4.1,
    spend: 1800,
    budget: 5000,
    description: 'Developer newsletter Sponsorships and direct API-sandbox invitations targeting senior cloud developers.',
    lastActive: '1 hr ago'
  },
  {
    id: 'CMP-704',
    name: 'SaaS Playbook Download',
    status: 'Paused',
    channel: 'Email',
    leadsCount: 1120,
    conversionRate: 11.8,
    spend: 2300,
    budget: 3000,
    description: 'Ebook lead-magnet landing page offering the "2026 B2B Outbound Blueprint" with instant email automated triggers.',
    lastActive: '1 day ago'
  },
  {
    id: 'CMP-705',
    name: 'APAC Executive Event',
    status: 'Completed',
    channel: 'Unified Voice',
    leadsCount: 420,
    conversionRate: 18.5,
    spend: 6500,
    budget: 6500,
    description: 'Automated high-quality voice verification sequences setting calendar holds for Tokyo dinner VIP delegates.',
    lastActive: '3 days ago'
  },
  {
    id: 'CMP-706',
    name: 'MENA Enterprise Launch',
    status: 'Draft',
    channel: 'Ad Campaign',
    leadsCount: 0,
    conversionRate: 0,
    spend: 0,
    budget: 12000,
    description: 'Localized Arabic-language advertising creatives matching GCC country compliance with high-value CRM options.',
    lastActive: 'Created on Jun 10'
  }
];

export const INITIAL_ACTIVITY: ActivityLog[] = [
  {
    id: 'log-1',
    title: 'New Lead Ingested',
    description: 'Sarah Jenkins from apexcorp.io uploaded from LinkedIn Campaign (Q2 Executive Outreach).',
    time: '4 mins ago',
    type: 'lead_in'
  },
  {
    id: 'log-2',
    title: 'Lead Automatically Qualified',
    description: 'Lead Marcus Vance scored 94 points based on email fit (@vanguard-tech.com) & budget match. Routed to CRM.',
    time: '18 mins ago',
    type: 'automation'
  },
  {
    id: 'log-3',
    title: 'Campaign Instantly Synchronized',
    description: 'Inbound Demo Request Google Ads campaigns data pulled successfully; synced 18 new clicks, budget balanced.',
    time: '1 hr ago',
    type: 'campaign_trigger'
  },
  {
    id: 'log-4',
    title: 'Routing Rule Executed',
    description: 'Routed Sofia Al-Fayed to Dubai Enterprise Account Executive team based on UAE geographic rule.',
    time: '2 hrs ago',
    type: 'automation'
  },
  {
    id: 'log-5',
    title: 'Slack Alert Successfully Sent',
    description: 'Triggered developer Slack integration webhook for priority lead validation webhook: OK.',
    time: '3 hrs ago',
    type: 'system_alert'
  }
];

export const INITIAL_SYSTEMS: SystemStatus[] = [
  {
    service: 'API Webhook Gateway',
    status: 'operational',
    latency: '42ms'
  },
  {
    service: 'AI Scoring Rule Engine',
    status: 'operational',
    latency: '118ms'
  },
  {
    service: 'Router Rules Processor',
    status: 'nominal',
    latency: '8ms'
  },
  {
    service: 'OAuth Consent Sync Manager',
    status: 'operational',
    latency: '184ms'
  }
];

export const DEFAULT_SETTINGS: PlatformSettings = {
  companyName: 'Lead Auto Global',
  senderEmail: 'automation@leadauto.agency',
  apiKey: 'la_live_bf9d7a2c09ef48419dbf07',
  dailyLeadLimit: 5000,
  enableRouting: true,
  scoringThreshold: 75,
  slackWebhook: '',
  timezone: 'America/New_York',
  routingRules: [
    {
      id: 'RR-101',
      name: 'LinkedIn Enterprise AE routing',
      criterion: 'source',
      operator: 'equals',
      value: 'LinkedIn',
      assignee: 'Alex Rivera',
      isActive: true
    },
    {
      id: 'RR-102',
      name: 'High Score Inbound VIP Dispatch',
      criterion: 'score',
      operator: 'greater_than',
      value: '85',
      assignee: 'Sophia Martinez',
      isActive: true
    },
    {
      id: 'RR-103',
      name: 'Google Ads Trial Router',
      criterion: 'source',
      operator: 'equals',
      value: 'Google Ads',
      assignee: 'Marcus Chen',
      isActive: false
    }
  ]
};
