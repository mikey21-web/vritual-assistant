import { useState } from "react";
import {
  LayoutDashboard, Users, MessageSquare, BarChart3, Settings,
  Megaphone, FormInput, QrCode, FileText, Route, Target,
  ShoppingCart, Link, Calendar, Layers, ChevronLeft, ChevronRight,
  Menu, UserCircle,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    label: "Leads",
    items: [
      { label: "Leads", icon: Users, path: "/leads" },
      { label: "Contacts", icon: UserCircle, path: "/contacts" },
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
      { label: "Forms", icon: FormInput, path: "/forms" },
      { label: "QR Codes", icon: QrCode, path: "/qr-codes" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { label: "Conversations", icon: MessageSquare, path: "/conversations" },
      { label: "Templates", icon: FileText, path: "/templates" },
      { label: "Media", icon: Layers, path: "/media" },
    ],
  },
  {
    label: "Automation",
    items: [
      { label: "Nurture", icon: Route, path: "/nurture" },
      { label: "Scoring", icon: BarChart3, path: "/scoring" },
      { label: "Rules", icon: Target, path: "/rules" },
    ],
  },
  {
    label: "Pipeline",
    items: [
      { label: "Conversions", icon: ShoppingCart, path: "/conversions" },
      { label: "Tasks", icon: CheckSquare, path: "/tasks" },
    ],
  },
  {
    label: "Integrations",
    items: [
      { label: "Integrations", icon: Link, path: "/integrations" },
      { label: "CRM", icon: ShoppingCart, path: "/crm" },
      { label: "Booking", icon: Calendar, path: "/booking" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

function CheckSquare(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>; }

export function Sidebar({ collapsed, onToggle, onMobileClose }: { collapsed: boolean; onToggle: () => void; onMobileClose?: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[var(--border)] bg-[var(--card)] transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          {!collapsed && <span className="font-display text-lg font-bold text-[var(--foreground)]">LeadAuto</span>}
          <button onClick={onToggle} className="rounded-md p-1.5 hover:bg-[var(--accent)]">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && <p className="px-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mb-1">{group.label}</p>}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = window.location.hash === `#${item.path}` || (!window.location.hash && item.path === "/");
                  return (
                    <a
                      key={item.path}
                      href={`#${item.path}`}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      }`}
                    >
                      <item.icon size={16} />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User area */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-medium text-white">A</div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">admin@local</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
