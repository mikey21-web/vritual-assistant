/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  NavigationPage, NavCategory, NavItem 
} from '../types';
import { 
  LayoutDashboard, Users, Contact, Megaphone, FileInput, QrCode, 
  MessageSquare, LayoutTemplate, FileImage, Sparkles, Award, GitFork, 
  CheckSquare, TrendingUp, Cpu, Database, CalendarDays, BarChart3, 
  ShieldAlert, Settings, Briefcase, Layers, Presentation, Menu, ChevronLeft, ChevronRight, LogOut 
} from 'lucide-react';

interface SidebarProps {
  id?: string;
  activePage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  userEmail?: string;
}

// Complete 25 navigation pages mapped logically into categories
const NAVIGATION_LINKS: NavItem[] = [
  // CORE
  { id: 'Overview', label: 'Overview', category: 'Dashboard' },
  // ACQUISITION
  { id: 'Leads', label: 'Leads Directory', category: 'Acquisition', count: 12 },
  { id: 'Contacts', label: 'Contacts database', category: 'Acquisition' },
  { id: 'Campaigns', label: 'Campaigns Panel', category: 'Acquisition', count: 3 },
  { id: 'Forms', label: 'Capture Forms', category: 'Acquisition' },
  { id: 'QR Codes', label: 'Generator QR Codes', category: 'Acquisition' },
  // OUTREACH
  { id: 'Messages', label: 'Unified Inbox', category: 'Outreach', badge: 'New' },
  { id: 'Templates', label: 'Message Templates', category: 'Outreach' },
  { id: 'Media', label: 'Asset Library', category: 'Outreach' },
  // AUTOMATION
  { id: 'Nurture', label: 'Nurturing Streams', category: 'Automation' },
  { id: 'Scoring', label: 'AI Scoring Rules', category: 'Automation' },
  { id: 'Routing', label: 'Lead Dispatch Rules', category: 'Automation' },
  { id: 'Tasks', label: 'Tasks Desk', category: 'Automation', count: 12 },
  { id: 'Conversions', label: 'Goal Conversions', category: 'Automation' },
  // INTEGRATIONS & INTELLIGENCE
  { id: 'Integrations', label: 'Connected Apps', category: 'Integrations & Intel' },
  { id: 'CRM', label: 'CRM Sync Hub', category: 'Integrations & Intel' },
  { id: 'Booking', label: 'Meeting Schedulers', category: 'Integrations & Intel' },
  { id: 'Analytics', label: 'Data Analytics', category: 'Integrations & Intel' },
  // OPERATIONS
  { id: 'Team', label: 'Team Accounts', category: 'Operations' },
  { id: 'Audit Logs', label: 'Security Audits', category: 'Operations' },
  { id: 'Advanced', label: 'Advanced Engine', category: 'Operations' },
  { id: 'Settings', label: 'System Settings', category: 'Operations' },
  // CLIENT HUB
  { id: 'Clients', label: 'Clients Roster', category: 'Client Hub' },
  { id: 'Niche Templates', label: 'Niche Presets', category: 'Client Hub' },
  { id: 'Client Workspace', label: 'Workspace Portal', category: 'Client Hub' },
];

const CATEGORIES: NavCategory[] = [
  'Dashboard',
  'Acquisition',
  'Outreach',
  'Automation',
  'Integrations & Intel',
  'Operations',
  'Client Hub'
];

export default function Sidebar({
  id,
  activePage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  userEmail = 'udayakirantumma@gmail.com'
}: SidebarProps) {
  
  // Icon mapper function matching exactly the senior designer look
  const getPageIcon = (page: NavigationPage) => {
    switch (page) {
      case 'Overview':
        return <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />;
      case 'Leads':
        return <Users className="w-3.5 h-3.5 shrink-0" />;
      case 'Contacts':
        return <Contact className="w-3.5 h-3.5 shrink-0" />;
      case 'Campaigns':
        return <Megaphone className="w-3.5 h-3.5 shrink-0" />;
      case 'Forms':
        return <FileInput className="w-3.5 h-3.5 shrink-0" />;
      case 'QR Codes':
        return <QrCode className="w-3.5 h-3.5 shrink-0" />;
      case 'Messages':
        return <MessageSquare className="w-3.5 h-3.5 shrink-0" />;
      case 'Templates':
        return <LayoutTemplate className="w-3.5 h-3.5 shrink-0" />;
      case 'Media':
        return <FileImage className="w-3.5 h-3.5 shrink-0" />;
      case 'Nurture':
        return <Sparkles className="w-3.5 h-3.5 shrink-0" />;
      case 'Scoring':
        return <Award className="w-3.5 h-3.5 shrink-0" />;
      case 'Routing':
        return <GitFork className="w-3.5 h-3.5 shrink-0" />;
      case 'Tasks':
        return <CheckSquare className="w-3.5 h-3.5 shrink-0" />;
      case 'Conversions':
        return <TrendingUp className="w-3.5 h-3.5 shrink-0" />;
      case 'Integrations':
        return <Cpu className="w-3.5 h-3.5 shrink-0" />;
      case 'CRM':
        return <Database className="w-3.5 h-3.5 shrink-0" />;
      case 'Booking':
        return <CalendarDays className="w-3.5 h-3.5 shrink-0" />;
      case 'Analytics':
        return <BarChart3 className="w-3.5 h-3.5 shrink-0" />;
      case 'Team':
        return <Users className="w-3.5 h-3.5 shrink-0" />;
      case 'Audit Logs':
        return <ShieldAlert className="w-3.5 h-3.5 shrink-0" />;
      case 'Advanced':
        return <Layers className="w-3.5 h-3.5 shrink-0" />;
      case 'Settings':
        return <Settings className="w-3.5 h-3.5 shrink-0" />;
      case 'Clients':
        return <Briefcase className="w-3.5 h-3.5 shrink-0" />;
      case 'Niche Templates':
        return <Layers className="w-3.5 h-3.5 shrink-0" />;
      case 'Client Workspace':
        return <Presentation className="w-3.5 h-3.5 shrink-0" />;
      default:
        return <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  return (
    <aside
      id={id || 'sidebar-root'}
      className={`bg-gray-950 text-gray-300 border-r border-gray-900 flex flex-col h-full z-30 transition-all duration-300 relative select-none ${
        isCollapsed ? 'w-[64px]' : 'w-[250px]'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-gray-900 shrink-0">
        <div className={`flex items-center gap-2 border border-transparent transition-all ${isCollapsed ? 'mx-auto justify-center' : ''}`}>
          <div className="h-6 w-6 rounded-md bg-blue-600 flex items-center justify-center font-bold font-display text-white text-xs shrink-0 shadow-inner">
            L
          </div>
          {!isCollapsed && (
            <span className="font-display font-semibold tracking-tight text-[15px] text-zinc-100 flex items-center gap-1.5">
              Lead Auto
              <span className="font-mono text-[9px] bg-gray-900 border border-gray-800 text-gray-400 font-semibold px-1 py-0.2 rounded">
                v2.4
              </span>
            </span>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-md border border-gray-900 bg-gray-950 cursor-pointer hidden md:block"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Collapsed Toggle overlay trigger for small sizes */}
      {isCollapsed && (
        <div className="py-2.5 flex justify-center border-b border-gray-900 shrink-0 hidden md:flex">
          <button
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-900 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dynamic Scrolling Link Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {CATEGORIES.map((cat) => {
          const catLinks = NAVIGATION_LINKS.filter((item) => item.category === cat);
          if (catLinks.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              {/* Category label */}
              {!isCollapsed && (
                <h4 className="text-[10px] font-mono tracking-widest text-gray-500 font-semibold px-2 uppercase pb-1">
                  {cat === 'Dashboard' ? 'Operations' : cat}
                </h4>
              )}

              {/* Links inside Category */}
              <div className="space-y-0.5">
                {catLinks.map((item) => {
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`w-full flex items-center rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all group cursor-pointer relative ${
                        isActive
                          ? 'bg-gray-900/80 text-zinc-100 border-l-[3px] border-l-blue-600 rounded-l-none'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/30 border-l-[3px] border-l-transparent'
                      } ${isCollapsed ? 'justify-center py-2' : 'justify-between'}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`transition-colors ${isActive ? 'text-blue-500' : 'text-gray-500 group-hover:text-gray-400'}`}>
                          {getPageIcon(item.id)}
                        </span>
                        {!isCollapsed && <span className="truncate tracking-wide">{item.label}</span>}
                      </div>

                      {/* Optional badges or counters */}
                      {!isCollapsed && (
                        <>
                          {item.count !== undefined && (
                            <span className="font-mono text-[10px] text-gray-500 bg-gray-900 border border-gray-800 px-1.5 py-0.2 rounded-full">
                              {item.count}
                            </span>
                          )}
                          {item.badge !== undefined && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/15 font-mono font-bold px-1.5 py-0.2 rounded uppercase tracking-wide">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      
                      {/* Left border active decorator */}
                      {isActive && !isCollapsed && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600 rounded-r" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Area with Initials fall back & User email */}
      <div className="p-3 border-t border-gray-900 shrink-0 bg-gray-950/60 select-none">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="h-8 w-8 rounded-lg bg-orange-600 text-white font-bold font-sans flex items-center justify-center text-xs shrink-0 uppercase tracking-tight shadow-md border border-gray-800">
            {getInitials(userEmail)}
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-100 truncate font-display">
                Senior Designer Log
              </p>
              <p className="text-[10px] text-gray-500 truncate font-mono">
                {userEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
