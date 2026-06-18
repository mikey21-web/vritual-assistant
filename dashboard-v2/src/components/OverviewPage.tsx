/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import { ActivityLog, Lead, SystemStatus } from '../types';
import { Play, Sparkles, Send, Download, CheckCircle, AlertTriangle, Radio, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface OverviewPageProps {
  leads: Lead[];
  onAddLead: (lead: Lead) => void;
  activity: ActivityLog[];
  onAddActivity: (log: ActivityLog) => void;
  systemStatus: SystemStatus[];
  onNavigate: (page: any) => void;
}

export default function OverviewPage({
  leads,
  onAddLead,
  activity,
  onAddActivity,
  systemStatus,
  onNavigate,
}: OverviewPageProps) {
  const [triggerCount, setTriggerCount] = useState(0);

  // Derive stats
  const totalLeads = leads.length;
  const leadPipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const activeCampaignsCount = 3; 
  const conversionRate = 12.4;

  const handleSimulateLead = () => {
    const names = ['Ethan Hunt', 'Gabrielle Roy', 'Liam Neeson', 'Chloe Zhao', 'Mateo Silva'];
    const companies = ['impossible.net', 'royale.ca', 'taken.co', 'nomadland.io', 'pampas.ar'];
    const campaigns = ['Q2 Executive Outreach', 'Inbound Demo Request', 'Developer Relations v3'];
    const sources = ['LinkedIn', 'Google Ads', 'Organic Search', 'Meta', 'Cold Outreach'] as const;
    const values = [5000, 8500, 12000, 3100, 9500];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomCampaign = campaigns[Math.floor(Math.random() * campaigns.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    const randomVal = values[Math.floor(Math.random() * values.length)];

    const email = `${randomName.toLowerCase().replace(' ', '.')}@${randomCompany}`;
    const idNum = Math.floor(Math.random() * 9000) + 1000;
    const id = `L-${idNum}`;

    const newLead: Lead = {
      id,
      name: randomName,
      email,
      phone: `+1 (555) 722-${Math.floor(Math.random() * 9000) + 1000}`,
      campaignName: randomCampaign,
      status: 'New',
      value: randomVal,
      source: randomSource,
      dateCreated: new Date().toISOString(),
      avatarColor: 'bg-blue-100 text-blue-800',
    };

    onAddLead(newLead);

    // Add activity
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      title: 'Inbound Lead Generated',
      description: `Lead ${randomName} (${randomCompany}) generated via ${randomSource} targeting ${randomCampaign}.`,
      time: 'Just now',
      type: 'lead_in',
    };
    onAddActivity(newLog);

    toast.success(`Simulated Lead Ingested: ${randomName} from ${randomSource}!`, {
      id: `sim-${Date.now()}`,
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
      icon: '✨',
    });
  };

  const handleRunRouter = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1400)),
      {
        loading: 'Querying pending lead records...',
        success: 'Successfully routed 3 new leads to appropriate CRM nodes!',
        error: 'Routing failure',
      },
      {
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '13px',
          border: '1px solid rgba(228, 228, 231, 0.15)',
          fontFamily: 'Inter, sans-serif',
        },
      }
    );

    // Add activity
    setTimeout(() => {
      onAddActivity({
        id: `activity-router-${Date.now()}`,
        title: 'Lead Routing Suite Executed',
        description: 'Lead scoring threshold met. Dispatched 3 leads into Zoho CRM sandbox securely.',
        time: 'Just now',
        type: 'automation',
      });
    }, 1400);
  };

  const handleTestPing = () => {
    toast.success('System Connectivity OK: SMTP & Slack webhooks reporting healthy.', {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
      icon: '⚡',
    });
  };

  return (
    <div id="overview-page-root" className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor lead acquisition streams, automated scoring engines, and outbound routing nodes in real-time."
        category="Unified Operations"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateLead}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg px-3 py-2 transition-colors cursor-pointer shadow-[var(--shadow-subtle)] focus:ring-1 focus:ring-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Simulate Inbound Lead
            </button>
            <button
              onClick={handleRunRouter}
              className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-1 focus:ring-gray-200 transition-colors shadow-[var(--shadow-subtle)] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-gray-400" />
              Run Router Engine
            </button>
          </div>
        }
      />

      {/* Stats Section with Custom Spacing and Weights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Lead Pipeline Value"
          value={`$${leadPipelineValue.toLocaleString()}`}
          change="+$14,200 today"
          changeDirection="up"
          timeframe=""
          isHero={true}
          sparklineData={[112000, 118000, 124000, 122000, 131000, 145000, leadPipelineValue]}
        />
        
        <StatCard
          title="Total Leads Logged"
          value={totalLeads.toString()}
          change="+18% on avg"
          changeDirection="up"
          timeframe="weekly"
          sparklineData={[8, 9, 10, 10, 11, totalLeads]}
        />

        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change="+0.8% this month"
          changeDirection="up"
          timeframe=""
          sparklineData={[11.5, 11.2, 11.9, 12.1, 12.4]}
        />

        <StatCard
          title="Active Campaigns"
          value={activeCampaignsCount.toString()}
          change="No change"
          changeDirection="neutral"
          timeframe="last 14d"
          sparklineData={[3, 3, 3, 3, 3, 3]}
        />
      </div>

      {/* Main Grid: Activity Feed & System Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Live Event Stream & Router Operations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Setup Card Grid */}
          <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5">
            <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-400 mb-4">
              Diagnostic & Action Center
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={() => onNavigate('Leads')}
                className="text-left p-3.5 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Send className="w-4 h-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  <span className="text-xs font-semibold text-gray-950 font-display">View All Leads</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Analyze filtered tables, customize data columns, and export lead sheets.
                </p>
              </button>

              <button 
                onClick={() => onNavigate('Campaigns')}
                className="text-left p-3.5 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 transition-transform group-hover:scale-105" />
                  <span className="text-xs font-semibold text-gray-950 font-display">Manage Campaigns</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Track dynamic inbounds, channels, conversion ratios, and budgets.
                </p>
              </button>

              <button 
                onClick={handleTestPing}
                className="text-left p-3.5 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 hover:border-gray-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span className="text-xs font-semibold text-gray-950 font-display">Ping SMTP Gateway</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Force a background sanity poll across mailer accounts and logs.
                </p>
              </button>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-400">
                Operational Event Stream
              </h2>
              <span className="text-[10px] bg-blue-50 text-blue-700/80 font-mono font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Live Influx
              </span>
            </div>

            <div className="flow-root">
              <ul className="-mb-8">
                {activity.map((log, logIdx) => (
                  <li key={log.id}>
                    <div className="relative pb-6">
                      {logIdx !== activity.length - 1 ? (
                        <span className="absolute top-4 left-3.5 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3 items-start">
                        <div>
                          <span className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border ring-4 ring-white ${
                            log.type === 'lead_in'
                              ? 'bg-blue-50 border-blue-100 text-blue-600'
                              : log.type === 'campaign_trigger'
                                ? 'bg-violet-50 border-violet-100 text-violet-600'
                                : log.type === 'automation'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : 'bg-amber-50 border-amber-100 text-amber-600'
                          }`}>
                            {log.type === 'lead_in' && <Plus className="w-3.5 h-3.5" />}
                            {log.type === 'campaign_trigger' && <Sparkles className="w-3.5 h-3.5" />}
                            {log.type === 'automation' && <Play className="w-3.5 h-3.5" />}
                            {log.type === 'system_alert' && <Radio className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between gap-x-2">
                            <p className="text-xs font-semibold text-gray-950 font-display">
                              {log.title}
                            </p>
                            <span className="font-mono text-[10px] text-gray-400 shrink-0">
                              {log.time}
                            </span>
                          </div>
                          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                            {log.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): System Health & Server Nodes */}
        <div className="space-y-6">
          <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5">
            <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-400 mb-4">
              Automation Node Diagnostics
            </h2>
            <div className="space-y-3.5">
              {systemStatus.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50/30 rounded-lg">
                  <div className="space-y-0.5">
                    <span className="text-[12px] font-semibold text-gray-950 block font-display">
                      {service.service}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 block">
                      Response: {service.latency}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {service.status === 'operational' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Operational
                      </span>
                    ) : service.status === 'nominal' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        <CheckCircle className="w-3 h-3 text-blue-600" />
                        Healthy
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Degraded
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                All nodes online
              </span>
              <span>Updated 12s ago</span>
            </div>
          </div>

          {/* Core Configuration Summary */}
          <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 text-xs text-gray-500 space-y-3 relative overflow-hidden">
            <h2 className="text-xs font-semibold font-mono uppercase tracking-wider text-gray-400 mb-2">
              Ingestion Config Webhook
            </h2>
            <p className="text-[12px] leading-relaxed">
              Route your raw webhook payloads directly here for automatic structural normalization:
            </p>
            <div className="bg-gray-950 text-gray-100 p-3 rounded-lg font-mono text-[10px] overflow-x-auto border border-gray-800 shadow-inner">
              <span className="text-gray-400">// Inbound URL payload</span>
              <br />
              POST https://api.leadauto.ai/v1/ingest
              <br />
              Authorization: Bearer la_live_***
            </div>
            <div className="flex justify-between items-center text-[10px] pt-1.5 text-gray-400">
              <span>MIME: application/json</span>
              <span className="text-blue-600 font-medium hover:underline cursor-pointer" onClick={() => onNavigate('Settings')}>
                Configure keys →
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
