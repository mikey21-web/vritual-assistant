/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PageHeader from './PageHeader';
import EmptyState from './EmptyState';
import { Campaign, CampaignStatus, CampaignChannel } from '../types';
import { Plus, Mail, MessageSquare, Megaphone, Phone, Linkedin, MoreHorizontal, Copy, ToggleLeft, ToggleRight, Sparkles, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';

interface CampaignsPageProps {
  campaigns: Campaign[];
  onAddCampaign: (campaign: Campaign) => void;
  onUpdateCampaignStatus: (id: string, status: CampaignStatus) => void;
}

export default function CampaignsPage({
  campaigns,
  onAddCampaign,
  onUpdateCampaignStatus,
}: CampaignsPageProps) {
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newChannel, setNewChannel] = useState<CampaignChannel>('Email');
  const [newBudget, setNewBudget] = useState(2500);
  const [newDesc, setNewDesc] = useState('');

  const handleDuplicate = (camp: Campaign) => {
    const dupId = `CMP-${Math.floor(Math.random() * 900) + 100}`;
    const duplicated: Campaign = {
      ...camp,
      id: dupId,
      name: `${camp.name} (Copy)`,
      status: 'Draft',
      leadsCount: 0,
      conversionRate: 0,
      spend: 0,
    };
    onAddCampaign(duplicated);
    toast.success(`Successfully duplicated "${camp.name}" as draft Campaign ${dupId}`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
      icon: '👯',
    });
  };

  const handleToggleStatus = (camp: Campaign) => {
    const nextStatus: CampaignStatus = camp.status === 'Active' ? 'Paused' : 'Active';
    onUpdateCampaignStatus(camp.id, nextStatus);
    toast.success(`Campaign "${camp.name}" status updated to ${nextStatus}`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      toast.error('Campaign name is required');
      return;
    }
    const campId = `CMP-${Math.floor(Math.random() * 900) + 100}`;
    const created: Campaign = {
      id: campId,
      name: newName,
      channel: newChannel,
      status: 'Active',
      budget: newBudget,
      spend: 0,
      leadsCount: 0,
      conversionRate: 0,
      description: newDesc || 'No campaign description registered.',
      lastActive: 'Just now',
    };
    onAddCampaign(created);
    setIsCreating(false);
    setNewName('');
    setNewDesc('');
    toast.success(`Campaign "${created.name}" launched successfully!`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
      icon: '🚀',
    });
  };

  const renderChannelIcon = (channel: CampaignChannel) => {
    switch (channel) {
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4" />;
      case 'LinkedIn':
        return <Linkedin className="w-4 h-4" />;
      case 'Ad Campaign':
        return <Megaphone className="w-4 h-4" />;
      case 'Unified Voice':
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterChannel === 'All') return true;
    return c.channel === filterChannel;
  });

  return (
    <div id="campaigns-page-root" className="space-y-6">
      <PageHeader
        title="Acquisition Campaigns"
        description="Launch and oversee inbound and outbound automated campaign workflows across LinkedIn, paid search, and high-frequency email relays."
        category="Acquisition"
        actions={
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer shadow-[var(--shadow-subtle)]"
          >
            <Plus className="w-3.5 h-3.5" />
            {isCreating ? 'Cancel Wizard' : 'Draft New Campaign'}
          </button>
        }
      />

      {/* Creation Wizard Panel */}
      {isCreating && (
        <div className="border border-gray-200/60 bg-white shadow-[var(--shadow-premium)] rounded-xl p-5 max-w-xl mx-auto space-y-4 animate-slide-down">
          <div className="border-b border-gray-100 pb-2">
            <h3 className="font-semibold text-gray-950 font-display text-sm">Launch New Campaign Process</h3>
            <p className="text-xs text-gray-400">Establish structural details, routing category, and estimated budget constraints.</p>
          </div>
          <form onSubmit={handleCreateSubmit} className="space-y-3 font-sans text-xs">
            <div className="space-y-1">
              <label className="font-medium text-gray-700">Campaign Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Q3 SaaS Enterprise Direct"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-gray-700">Channel Strategy</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value as CampaignChannel)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-xs"
                >
                  <option value="Email">Email Marketing</option>
                  <option value="SMS">SMS Automation</option>
                  <option value="LinkedIn">LinkedIn Outreach</option>
                  <option value="Ad Campaign">Paid Search Ad Campaign</option>
                  <option value="Unified Voice">Unified Voice Verification</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-gray-700">Total Budget ($)</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
                  min="500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-gray-700">Campaign Description / Constraints</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Declare outline tags, target customer niches, or direct routing rules..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="border border-gray-200 bg-white text-gray-600 px-3 py-1.5 rounded-lg font-medium cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-semibold cursor-pointer shadow-[var(--shadow-subtle)]"
              >
                Establish Campaign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Segment */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex items-center gap-1 ml-1">
          <span className="text-[10px] font-semibold text-gray-400 font-mono tracking-wider uppercase mr-2">Filter Channels:</span>
          {['All', 'LinkedIn', 'Ad Campaign', 'Email', 'SMS', 'Unified Voice'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-3 py-1 text-[11px] font-mono font-medium rounded-md transition-all cursor-pointer ${
                filterChannel === ch
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid with ASYMMETRIC layout types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.length === 0 ? (
          <div className="col-span-full py-12">
            <EmptyState
              id="campaigns-empty"
              title="No campaigns discovered"
              description="No active outbound processes match this channel segment, or the lists have been wiped."
              actionLabel="Show All Campaigns"
              onAction={() => setFilterChannel('All')}
              icon="campaign"
            />
          </div>
        ) : (
          filteredCampaigns.map((camp) => {
            // Highly distinctive priority sizing: Active channels with budget > 5000 run as "featured" cards
            const isFeatured = camp.status === 'Active' && camp.budget >= 8000;
            const spendPercentage = camp.budget > 0 ? (camp.spend / camp.budget) * 100 : 0;

            const isCompleted = camp.status === 'Completed';
            const isPaused = camp.status === 'Paused';

            return (
              <div
                key={camp.id}
                className={`relative rounded-xl border bg-white shadow-[var(--shadow-premium)] transition-all flex flex-col justify-between group ${
                  isFeatured
                    ? 'md:col-span-2 border-l-2 border-l-blue-600 p-6 space-y-4'
                    : 'col-span-1 border-gray-200/50 p-5 space-y-3'
                }`}
              >
                {/* Header Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 ${
                        camp.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : camp.status === 'Paused'
                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        {renderChannelIcon(camp.channel)}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-semibold text-gray-400">
                        {camp.channel}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold rounded ${
                      camp.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : camp.status === 'Paused'
                          ? 'bg-amber-500/10 text-amber-700'
                          : camp.status === 'Completed'
                            ? 'bg-zinc-900/10 text-zinc-800'
                            : 'bg-gray-100 text-gray-500'
                    }`}>
                      {camp.status === 'Active' && <span className="h-1 w-1 bg-emerald-500 rounded-full animate-ping" />}
                      {camp.status}
                    </span>
                  </div>

                  <div className="pt-2 flex justify-between items-start gap-3">
                    <div>
                      <h4 className="text-sm font-semibold font-display text-gray-950 group-hover:text-blue-600 transition-colors">
                        {camp.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-mono tracking-tight pt-0.5">
                        ID: {camp.id} • Activity: {camp.lastActive}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description - only shown nicely in layout */}
                <p className={`text-[12px] text-gray-500 leading-relaxed font-sans ${isFeatured ? 'line-clamp-2 max-w-xl' : 'line-clamp-3'}`}>
                  {camp.description}
                </p>

                {/* Micro metrics - highly detailed on featured paths */}
                <div className={`grid gap-2 pt-2 border-t border-gray-100 ${isFeatured ? 'grid-cols-4' : 'grid-cols-2'}`}>
                  <div>
                    <span className="block text-[10px] font-mono text-gray-400 uppercase">Aggregated Leads</span>
                    <span className="font-mono text-xs font-semibold text-gray-950">{camp.leadsCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono text-gray-400 uppercase">Conversion %</span>
                    <span className="font-mono text-xs font-semibold text-gray-950">
                      {camp.conversionRate > 0 ? `${camp.conversionRate}%` : '---'}
                    </span>
                  </div>
                  
                  {isFeatured && (
                    <>
                      <div>
                        <span className="block text-[10px] font-mono text-gray-400 uppercase">Budget Pool</span>
                        <span className="font-mono text-xs font-semibold text-gray-950">${camp.budget.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-gray-400 uppercase">Utilization Ratio</span>
                        <span className="font-mono text-xs font-semibold text-gray-950">{spendPercentage.toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Linear tracking path (Budget Progress) */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                    <span>Utilization ({spendPercentage.toFixed(0)}%)</span>
                    <span>${camp.spend.toLocaleString()} / ${camp.budget.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        spendPercentage > 85 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(100, spendPercentage)}%` }}
                    />
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-[11px] text-gray-400 select-none">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(camp)}
                      className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      {camp.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={() => handleDuplicate(camp)}
                      className="flex items-center gap-1 font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      Duplicate
                    </button>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wide">
                    LA_CPL v2
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
