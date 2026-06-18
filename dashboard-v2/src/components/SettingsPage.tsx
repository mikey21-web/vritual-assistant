/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PageHeader from './PageHeader';
import { PlatformSettings } from '../types';
import { Save, Key, ShieldCheck, Eye, EyeOff, Clipboard, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import LeadRoutingRules from './LeadRoutingRules';

interface SettingsPageProps {
  settings: PlatformSettings;
  onSaveSettings: (settings: PlatformSettings) => void;
}

export default function SettingsPage({ settings, onSaveSettings }: SettingsPageProps) {
  const [localSettings, setLocalSettings] = useState<PlatformSettings>({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(localSettings.apiKey);
    toast.success('API Key securely copied to clipboard!', {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
  };

  const handleRefreshKey = () => {
    const freshKey = `la_live_${Array.from({ length: 22 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    setLocalSettings((s) => ({ ...s, apiKey: freshKey }));
    toast.success('Generated a fresh secure routing token. Save changes to activate.', {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      onSaveSettings(localSettings);
      setIsSaving(false);
      toast.success('Platform architecture settings saved safely!', {
        id: 'settings-saved',
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '13px',
          border: '1px solid rgba(228, 228, 231, 0.15)',
          fontFamily: 'Inter, sans-serif',
        },
        icon: '🔒',
      });
    }, 800);
  };

  return (
    <div id="settings-page-root" className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title="Platform Architecture Settings"
        description="Configure integration gateways, lead routing thresholds, Slack developers webhooks, and active API credentials."
        category="Operations"
      />

      <form onSubmit={handleSubmit} className="space-y-6 font-sans text-xs">
        
        {/* SECTION 1: General Business Details */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6 space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-semibold text-gray-950 font-display text-sm">Enterprise Identity</h3>
            <p className="text-[11px] text-gray-400">Identify your organization node and timezone defaults.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Organization/Company Name</label>
              <input
                type="text"
                value={localSettings.companyName}
                onChange={(e) => setLocalSettings((s) => ({ ...s, companyName: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-950 text-xs font-medium focus:ring-1 focus:ring-blue-500/20"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Timezone Node</label>
              <select
                value={localSettings.timezone}
                onChange={(e) => setLocalSettings((s) => ({ ...s, timezone: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-950 text-xs font-medium focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="America/New_York">Eastern Standard Time (EST) - NY</option>
                <option value="America/Chicago">Central Standard Time (CST)</option>
                <option value="America/Los_Angeles">Pacific Standard Time (PST) - LA</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Tokyo">Tokyo Standard Time (JST)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Automated Dispatch Email Alias</label>
            <input
              type="email"
              value={localSettings.senderEmail}
              onChange={(e) => setLocalSettings((s) => ({ ...s, senderEmail: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-950 text-xs font-medium focus:ring-1 focus:ring-blue-500/20"
              required
            />
            <p className="text-[10px] text-gray-400">All outbound messaging logs will declare this sender address.</p>
          </div>
        </div>

        {/* SECTION 2: Ingestion Credentials & Token Bounds */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6 space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-semibold text-gray-950 font-display text-sm">Ingestion Endpoints & Security</h3>
            <p className="text-[11px] text-gray-400">Configure bearer values for webhook security.</p>
          </div>

          {/* Secure API key mask */}
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Lead Auto Authentication Token</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localSettings.apiKey}
                  readOnly
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-gray-850 font-mono text-xs font-medium select-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  title={showKey ? 'Hide secret key' : 'Show secret key'}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyKey}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                title="Copy Token"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleRefreshKey}
                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-lg text-gray-500 hover:text-blue-600 cursor-pointer transition-colors"
                title="Regenerate Token"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400">Keep this production key strictly masked. Never expose it inside git logs.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Daily Lead Limit Ceiling</label>
              <input
                type="number"
                value={localSettings.dailyLeadLimit}
                onChange={(e) => setLocalSettings((s) => ({ ...s, dailyLeadLimit: Number(e.target.value) }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-950 text-xs font-medium focus:ring-1 focus:ring-blue-500/20"
                min="100"
                max="50000"
              />
              <p className="text-[10px] text-gray-400 font-mono">Current: {localSettings.dailyLeadLimit.toLocaleString()} runs</p>
            </div>
          </div>
        </div>

        {/* SECTION 3: Smart Automation Engines */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6 space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-semibold text-gray-950 font-display text-sm">Automated Scoring & Routing rules</h3>
            <p className="text-[11px] text-gray-400">Configure parameters for quality scoring filters.</p>
          </div>

          <div className="flex items-center justify-between p-3.5 border border-gray-100 bg-gray-50/20 rounded-xl">
            <div className="space-y-0.5">
              <span className="font-semibold text-gray-950 font-display text-[12px] block">
                Enable Instant Slack/CRM Routing Engine
              </span>
              <span className="text-[11px] text-gray-400 block max-w-md">
                Dispatches processed lead blocks immediately to assigned CRM instances, firing active integration streams.
              </span>
            </div>
            {/* Custom Toggle Switch (Pure Tailwind, Screen Reader Safe) */}
            <button
              type="button"
              onClick={() => setLocalSettings((s) => ({ ...s, enableRouting: !s.enableRouting }))}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                localSettings.enableRouting ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">Enable routing routing</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  localSettings.enableRouting ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-gray-700">Minimum Quality Scoring Threshold</label>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {localSettings.scoringThreshold} pts
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="95"
              value={localSettings.scoringThreshold}
              onChange={(e) => setLocalSettings((s) => ({ ...s, scoringThreshold: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <p className="text-[10px] text-gray-400">
              Inbound profiles with scores below this limit remain in the nurturing queue before final dispatch.
            </p>
          </div>
        </div>

        {/* SECTION FOR LEAD ROUTING RULES */}
        <LeadRoutingRules
          rules={localSettings.routingRules || []}
          onChangeRules={(newRules) => setLocalSettings((s) => ({ ...s, routingRules: newRules }))}
        />

        {/* SECTION 4: Developer Webhook Integration */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6 space-y-4">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-semibold text-gray-950 font-display text-sm">Developer Slack Webhook Endpoint</h3>
            <p className="text-[11px] text-gray-400">Push status flags to Slack developers channels.</p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block">Incoming Slack Webhook URL</label>
            <input
              type="url"
              value={localSettings.slackWebhook}
              onChange={(e) => setLocalSettings((s) => ({ ...s, slackWebhook: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-950 text-xs font-medium focus:ring-1 focus:ring-blue-500/20 font-mono text-[11px]"
              required
            />
            <p className="text-[10px] text-gray-400">Used for priority warnings when scoring nodes register major accounts.</p>
          </div>
        </div>

        {/* Submit Actions bar */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-200/60 select-none">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Platform conforms to Enterprise AES-256 standard constraints.</span>
          </div>
          
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-xs rounded-lg px-4 py-2 transition-colors cursor-pointer disabled:opacity-50 shadow-[var(--shadow-subtle)]"
          >
            <Save className="w-3.5 h-3.5 text-gray-300" />
            {isSaving ? 'Synchronizing Node...' : 'Commit Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
