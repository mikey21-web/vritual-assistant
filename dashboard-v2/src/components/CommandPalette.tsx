/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { 
  Search, CornerDownLeft, Sparkles, User, Megaphone, Settings, 
  ArrowRight, Globe, Lock, Mail, Phone, Hash, Shield, MessageSquare, 
  Layers, Database, CalendarDays, Cpu, HelpCircle
} from 'lucide-react';
import { Lead, Campaign, PlatformSettings, NavigationPage } from '../types';
import { toast } from 'react-hot-toast';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  campaigns: Campaign[];
  settings: PlatformSettings;
  onNavigate: (page: NavigationPage) => void;
}

interface UnifiedResult {
  id: string;
  type: 'page' | 'lead' | 'campaign' | 'setting';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  leads,
  campaigns,
  settings,
  onNavigate
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset query and selected index on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Let dialog render first then focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Unified list of searchable items
  const allItems = useMemo(() => {
    const list: UnifiedResult[] = [];

    // 1. Pages Navigation (Sleek options mapped onto active workflows)
    const pages: { id: NavigationPage; label: string; desc: string; icon: React.ReactNode }[] = [
      { id: 'Overview', label: 'Overview Dashboard', desc: 'Main control center, key performance stats, and real-time logs', icon: <Layers className="w-4 h-4 text-blue-500" /> },
      { id: 'Leads', label: 'Leads Directory', desc: 'Browse incoming leads, update status, and track values', icon: <User className="w-4 h-4 text-emerald-500" /> },
      { id: 'Campaigns', label: 'Campaigns Panel', desc: 'Configure marketing outbounds, check spend, and conversion rates', icon: <Megaphone className="w-4 h-4 text-violet-500" /> },
      { id: 'Settings', label: 'System Settings', desc: 'Change company name, update sender emails, adjust lead limits', icon: <Settings className="w-4 h-4 text-amber-500" /> },
      { id: 'Analytics', label: 'Data Analytics', desc: 'Audit inbound lead frequencies and performance grids', icon: <Cpu className="w-4 h-4 text-pink-500" /> },
      { id: 'Contacts', label: 'Contacts Database', desc: 'View global database of synchronized clients', icon: <User className="w-4 h-4 text-teal-500" /> },
      { id: 'Messages', label: 'Unified Inbox', desc: 'Read and send real-time SMS, Email, and outreach messages', icon: <MessageSquare className="w-4 h-4 text-indigo-500" /> },
      { id: 'Tasks', label: 'Tasks Desk', desc: 'Review scheduled platform reminders and daily execution checks', icon: <Shield className="w-4 h-4 text-gray-500" /> }
    ];

    pages.forEach(p => {
      list.push({
        id: `page-${p.id}`,
        type: 'page',
        title: p.label,
        subtitle: p.desc,
        badge: 'Page Nav',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
        icon: p.icon,
        action: () => {
          onNavigate(p.id);
          toast.success(`Navigated to ${p.label}`);
          onClose();
        }
      });
    });

    // 2. Leads Data
    leads.forEach(l => {
      // Create readable details
      const badgeColor = 
        l.status === 'New' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
        l.status === 'Qualified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
        l.status === 'Contacted' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
        l.status === 'Closed-Won' ? 'bg-purple-50 text-purple-700 border-purple-200/60' :
        'bg-gray-100 text-gray-700 border-gray-300/60';

      list.push({
        id: `lead-${l.id}`,
        type: 'lead',
        title: l.name,
        subtitle: `${l.email} • ${l.phone} • Source: ${l.source} • Campaign: ${l.campaignName} • Value: $${l.value.toLocaleString()}`,
        badge: l.status,
        badgeColor: badgeColor,
        icon: <User className="w-4 h-4 text-emerald-600" />,
        action: () => {
          onNavigate('Leads');
          toast(`Inspecting lead "${l.name}"`, {
            icon: '🔍',
            style: {
              background: '#09090b',
              color: '#f4f4f5',
              fontSize: '12px'
            }
          });
          onClose();
        }
      });
    });

    // 3. Campaigns Data
    campaigns.forEach(c => {
      const badgeColor =
        c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
        c.status === 'Paused' ? 'bg-amber-50 text-amber-700 border-amber-200/60' :
        'bg-gray-100 text-gray-700 border-gray-300/60';

      list.push({
        id: `campaign-${c.id}`,
        type: 'campaign',
        title: c.name,
        subtitle: `${c.description || 'Outreach campaign'} • Budget: $${c.budget.toLocaleString()} • Conversion: ${c.conversionRate}%`,
        badge: `${c.channel} | ${c.status}`,
        badgeColor: badgeColor,
        icon: <Megaphone className="w-4 h-4 text-violet-600" />,
        action: () => {
          onNavigate('Campaigns');
          toast(`Viewing Campaign details for "${c.name}"`, {
            icon: '📢',
            style: {
              background: '#09090b',
              color: '#f4f4f5',
              fontSize: '12px'
            }
          });
          onClose();
        }
      });
    });

    // 4. Platform Settings Configuration
    const settingsItems = [
      { key: 'companyName', label: 'Company Name', subtitle: `Set organization identity. Current: "${settings.companyName}"`, icon: <Database className="w-4 h-4 text-zinc-500" /> },
      { key: 'senderEmail', label: 'Sender Email Address', subtitle: `System outgoing automation address. Current: ${settings.senderEmail}`, icon: <Mail className="w-4 h-4 text-zinc-500" /> },
      { key: 'apiKey', label: 'Gemini API Hook Key', subtitle: `Server-secure AI connection credentials. Current: ${settings.apiKey ? '••••••••' : 'Not configured'}`, icon: <Lock className="w-4 h-4 text-zinc-500" /> },
      { key: 'dailyLeadLimit', label: 'Daily Leads Ingress Limit', subtitle: `Maximum cap for automated inbound entries. Current: ${settings.dailyLeadLimit.toLocaleString()} entries`, icon: <Hash className="w-4 h-4 text-zinc-500" /> },
      { key: 'enableRouting', label: 'AI Lead Despatch Routing', subtitle: `Toggle automatic distribution models. Current: ${settings.enableRouting ? 'ENABLED' : 'DISABLED'}`, icon: <Globe className="w-4 h-4 text-zinc-500" /> },
      { key: 'scoringThreshold', label: 'AI Score Quality Threshold', subtitle: `Standard parameters to classify hot contacts. Current: ${settings.scoringThreshold} / 100`, icon: <Sparkles className="w-4 h-4 text-zinc-500" /> },
      { key: 'slackWebhook', label: 'Slack Webhook Stream URL', subtitle: `Broadcasting socket. Current: ${settings.slackWebhook ? 'Successfully Linked' : 'None provided'}`, icon: <Cpu className="w-4 h-4 text-zinc-500" /> },
      { key: 'timezone', label: 'Operational System Timezone', subtitle: `Audit and activity logs coordinate. Current: ${settings.timezone}`, icon: <CalendarDays className="w-4 h-4 text-zinc-500" /> }
    ];

    settingsItems.forEach(s => {
      list.push({
        id: `setting-${s.key}`,
        type: 'setting',
        title: s.label,
        subtitle: s.subtitle,
        badge: 'Setting',
        badgeColor: 'bg-amber-50 text-amber-900 border-amber-200/60',
        icon: s.icon,
        action: () => {
          onNavigate('Settings');
          toast(`Adjust settings field: "${s.label}"`, {
            icon: '⚙️',
            style: {
              background: '#09090b',
              color: '#f4f4f5',
              fontSize: '12px'
            }
          });
          onClose();
        }
      });
    });

    return list;
  }, [leads, campaigns, settings, onNavigate, onClose]);

  // Filter items based on prompt query
  const filteredResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    
    // If query is empty, suggest recent pages and quick actions
    if (!cleanQuery) {
      // Find pages, first 2 leads, first campaign, 2 settings
      const pages = allItems.filter(item => item.type === 'page').slice(0, 4);
      const leadsSubset = allItems.filter(item => item.type === 'lead').slice(0, 1);
      const campaignSubset = allItems.filter(item => item.type === 'campaign').slice(0, 1);
      const settingsSubset = allItems.filter(item => item.type === 'setting').slice(0, 2);
      return [...pages, ...leadsSubset, ...campaignSubset, ...settingsSubset];
    }

    // High performance search filtering
    return allItems.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(cleanQuery);
      const matchSubtitle = item.subtitle.toLowerCase().includes(cleanQuery);
      const matchBadge = item.badge?.toLowerCase().includes(cleanQuery) || false;
      const matchType = item.type.toLowerCase().includes(cleanQuery);

      return matchTitle || matchSubtitle || matchBadge || matchType;
    });
  }, [allItems, query]);

  // Reset selected index when filtered list changes length
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  // Keyboard Navigation Events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredResults.length) % filteredResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          filteredResults[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  // Handle clicking scroll view alignment
  useEffect(() => {
    const selectedElement = scrollContainerRef.current?.children[selectedIndex] as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose} 
      className="relative z-50 font-sans"
    >
      {/* Search Overlay blur */}
      <DialogBackdrop 
        className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm transition-opacity duration-300" 
      />

      {/* Main Container Positioning */}
      <div className="fixed inset-0 overflow-y-auto px-4 py-16 sm:py-24 flex items-start justify-center">
        <DialogPanel 
          className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/65 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.12)] overflow-hidden w-full max-w-2xl transform transition-all flex flex-col max-h-[500px]"
        >
          {/* Header Bar Search */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-100 h-14 bg-white shrink-0">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search across leads, campaigns, system settings, or navigate pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-3 text-[14px] text-gray-800 focus:outline-none placeholder-gray-400 border-none font-sans"
            />
            
            {/* Quick keys badge */}
            <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400 font-semibold select-none">
              <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200/70 rounded">ESC</kbd>
            </div>
          </div>

          {/* Results scrolling board */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-[100px]"
          >
            {filteredResults.length === 0 ? (
              <div className="py-14 text-center select-none">
                <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-900 font-medium text-sm">No synchronized pipeline hits found</p>
                <p className="text-gray-400 text-xs mt-1">Try another email structure, campaign keyword, or setting option</p>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => item.action()}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3.5 select-none focus:outline-none cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/90 text-white shadow-[0_4px_12px_0_rgba(37,99,235,0.15)]' 
                        : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    {/* Rounded Icon badge wrapper */}
                    <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.icon}
                    </div>

                    {/* Meta text block */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-xs tracking-tight ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          {item.title}
                        </span>
                        
                        {item.badge && (
                          <span className={`text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                            isSelected 
                              ? 'bg-white/10 text-white border-white/20' 
                              : item.badgeColor
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-[11px] truncate mt-0.5 font-medium leading-relaxed ${
                        isSelected ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Action Hint Arrow Icon */}
                    {isSelected && (
                      <div className="shrink-0 self-center flex items-center gap-1 font-mono text-[9px] text-blue-200 uppercase font-bold tracking-wider mr-1">
                        <span>GO</span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-blue-100" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Sticky footer with navigation instructions */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0 flex items-center justify-between font-mono text-[9px] text-gray-400 uppercase font-bold select-none h-10">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.2 bg-white border border-gray-200 rounded">↑↓</span>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.2 bg-white border border-gray-200 rounded">↵ Enter</span>
                Select
              </span>
            </div>
            
            {query.trim() === '' ? (
              <span>Recently referenced metrics</span>
            ) : (
              <span>Found {filteredResults.length} index matches</span>
            )}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
