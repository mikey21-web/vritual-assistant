'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { clearToken, getToken } from '@/lib/api';
import {
  LayoutDashboard, Users, PhoneCall, Megaphone, FileText, QrCode,
  MessageSquare, FileEdit, Image, GitBranch, Target, Route,
  ListChecks, ArrowLeftRight, Plug, Link2, CalendarCheck,
  BarChart3, Shield, Settings, ChevronLeft, Menu, UserPlus, Wrench, Layers, Building2,
  AlertTriangle, Zap, Activity,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

const SUPER_ADMIN_NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tenants', label: 'Clients', icon: Building2 },
  { href: '/niche-templates', label: 'Niche Templates', icon: Layers },
];

const ALL_FEATURES = [
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/contacts', label: 'Contacts', icon: PhoneCall },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/forms', label: 'Forms', icon: FileText },
  { href: '/qr-codes', label: 'QR Codes', icon: QrCode },
  { href: '/conversations', label: 'Messages', icon: MessageSquare },
  { href: '/templates', label: 'Templates', icon: FileEdit },
  { href: '/media', label: 'Media', icon: Image },
  { href: '/nurture', label: 'Nurture', icon: GitBranch },
  { href: '/scoring', label: 'Scoring', icon: Target },
  { href: '/routing', label: 'Routing', icon: Route },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/conversions', label: 'Conversions', icon: ArrowLeftRight },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/crm-mappings', label: 'CRM', icon: Link2 },
  { href: '/booking', label: 'Booking', icon: CalendarCheck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/users', label: 'Team', icon: UserPlus },
  { href: '/audit-logs', label: 'Audit Logs', icon: Shield },
  { href: '/advanced', label: 'Advanced', icon: Wrench },
  { href: '/rules', label: 'Rules', icon: Zap },
  { href: '/failures', label: 'Failure Inbox', icon: AlertTriangle },
  { href: '/health', label: 'Health', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const CLIENT_NAV = [
  { href: '/client/workspace', label: 'My Workspace', icon: Building2 },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/contacts', label: 'Contacts', icon: PhoneCall },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/forms', label: 'Forms', icon: FileText },
  { href: '/conversations', label: 'Messages', icon: MessageSquare },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const ALL_ITEMS = [...SUPER_ADMIN_NAV, ...ALL_FEATURES];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, fetchProfile, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    fetchProfile().catch(() => {});
  }, []);

  const handleLogout = () => { logout(); router.push('/login'); };

  const isSuperAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const displayNav = isSuperAdmin
    ? [...SUPER_ADMIN_NAV, ...ALL_FEATURES]
    : CLIENT_NAV;

  const navItems = displayNav;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className={clsx(
        'bg-gray-900 text-white flex flex-col transition-all duration-200 shrink-0',
        collapsed ? 'w-16' : 'w-60',
        'hidden md:flex'
      )}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!collapsed && <span className="font-bold text-sm">Lead Auto</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-700 rounded">
            {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors',
                pathname === item.href && 'bg-blue-600 hover:bg-blue-700'
              )}>
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-700 p-4">
          {!collapsed && (
            <div className="text-xs text-gray-400 mb-2">{user?.email || 'Loading...'}</div>
          )}
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-white w-full text-left">Logout</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b h-14 flex items-center justify-between px-4 shrink-0">
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={20} /></button>
          <div className="text-sm font-medium">{ALL_ITEMS.find(n => n.href === pathname)?.label || 'Dashboard'}</div>
          <div className="text-xs text-gray-500">{user?.email}</div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative bg-gray-900 text-white w-60 h-full flex flex-col">
            <div className="p-4 border-b border-gray-700 font-bold text-sm">Lead Auto</div>
            <nav className="flex-1 overflow-y-auto py-2">
              {navItems.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={clsx('flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-800', pathname === item.href && 'bg-blue-600')}>
                  <item.icon size={18} /><span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
