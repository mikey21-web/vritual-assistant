import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, MessageSquare, BarChart3, Settings,
  Megaphone, FormInput, QrCode, FileText, Route, Target,
  ShoppingCart, Link, Calendar, Layers, ChevronLeft, ChevronRight, ChevronDown,
  UserCircle, CheckSquare, Sparkles, Phone,   Bot, MessageCircle, Smartphone, Webhook, Globe, LogOut, Columns3,
  LifeBuoy, BookOpen, Puzzle, Download, Headset, Brain,
  Truck, ClipboardList, Package, Box, MapPin, Building2, Activity,
} from "lucide-react";
import { fetchProfile, fetchBusinessSettings } from "../../lib/data";
import { useAuth } from "../../lib/useAuth";
import { useBranding } from "../../lib/useBranding";

import { isFeatureEnabled, getLabel, getBusinessName, getNicheLogo } from "../../lib/niche-config";

const featureMap: Record<string, string> = {
  "/": "overview", "/leads": "leads", "/pipeline": "pipeline", "/contacts": "contacts",
  "/campaigns": "campaigns", "/forms": "forms", "/qr-codes": "qrCodes",
  "/conversations": "messages", "/templates": "templates", "/media": "media",
  "/nurture": "nurture", "/scoring": "scoring", "/rules": "routing",
  "/ai-campaigns": "aiCampaigns", "/ai-agent": "aiAgent", "/copilot": "copilot",
  "/webhooks": "webhooks", "/sms": "sms", "/widget": "widget", "/calls": "calls", "/sync-logs": "syncLogs",
  "/tasks": "tasks", "/conversions": "conversions",
  "/events": "events", "/calendar": "events", "/create-event": "events",
  "/event-detail": "events",
  "/accounting": "finance", "/invoices": "finance", "/quotations": "finance",
  "/contracts": "finance", "/finance-reports": "finance",
  "/partners": "procurement", "/vendor-bookings": "procurement", "/purchase-orders": "procurement",
  "/inventory": "inventory", "/stock-movements": "inventory", "/locations": "inventory",
  "/team": "teamHr", "/leave-log": "teamHr", "/salaries": "teamHr", "/timesheet": "teamHr",
  "/integrations": "integrations", "/crm": "crm", "/booking": "booking",
  "/tickets": "tickets", "/knowledge-base": "knowledgeBase",
  "/analytics": "analytics", "/reports": "reports", "/studio": "studio",
  "/settings": "settings", "/import": "import", "/ads": "adIntegrations",
  "/website-crawler": "websiteCrawler", "/public-profile": "publicProfile",   "/properties": "properties", "/shipments": "shipments",
};

const labelMap: Record<string, "contact" | "conversion"> = {
  "/contacts": "contact",
  "/conversions": "conversion",
};

const rawNavGroups = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    label: "Leads",
    items: [
      { label: "Leads", icon: Users, path: "/leads" },
      { label: "Pipeline", icon: Columns3, path: "/pipeline" },
      { label: "Contacts", icon: UserCircle, path: "/contacts" },
      { label: "Campaigns", icon: Megaphone, path: "/campaigns" },
      { label: "Forms", icon: FormInput, path: "/forms" },
      { label: "QR Codes", icon: QrCode, path: "/qr-codes" },
    ],
  },
  {
    label: "Outreach",
    items: [
      { label: "Message Log", icon: MessageSquare, path: "/conversations" },
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
      { label: "AI Campaigns", icon: Sparkles, path: "/ai-campaigns" },
      { label: "AI Agent", icon: Bot, path: "/ai-agent" },
      { label: "Copilot", icon: MessageCircle, path: "/copilot" },
      { label: "Mikey", icon: Brain, path: "/mikey" },
    ],
  },
  {
    label: "Channels",
    items: [
      { label: "Webhooks", icon: Webhook, path: "/webhooks" },
      { label: "SMS", icon: Smartphone, path: "/sms" },
      { label: "Chat Widget", icon: Globe, path: "/widget" },
      { label: "Calls", icon: Phone, path: "/calls" },
      { label: "Sync Logs", icon: Activity, path: "/sync-logs" },
      { label: "Social Media", icon: MessageCircle, path: "/integrations" },
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
    label: "Listings",
    items: [
      { label: "Properties", icon: Building2, path: "/properties" },
    ],
  },
  {
    label: "Shipments",
    items: [
      { label: "Shipments", icon: Truck, path: "/shipments" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Events", icon: Calendar, path: "/events" },
      { label: "Calendar", icon: Calendar, path: "/calendar" },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Accounting", icon: BarChart3, path: "/accounting" },
      { label: "Invoices", icon: FileText, path: "/invoices" },
      { label: "Quotations", icon: FileText, path: "/quotations" },
      { label: "Contracts", icon: FileText, path: "/contracts" },
      { label: "Reports", icon: BarChart3, path: "/finance-reports" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Partners", icon: Truck, path: "/partners" },
      { label: "Vendor Bookings", icon: ClipboardList, path: "/vendor-bookings" },
      { label: "Purchase Orders", icon: Package, path: "/purchase-orders" },
    ],
  },
  {
    label: "Assets",
    items: [
      { label: "Inventory", icon: Box, path: "/inventory" },
      { label: "Stock Movements", icon: Layers, path: "/stock-movements" },
      { label: "Locations", icon: MapPin, path: "/locations" },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Team Members", icon: Users, path: "/team" },
      { label: "Leave Log", icon: Calendar, path: "/leave-log" },
      { label: "Salaries", icon: BarChart3, path: "/salaries" },
      { label: "Timesheet", icon: CheckSquare, path: "/timesheet" },
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
    label: "Support",
    items: [
      { label: "Tickets", icon: LifeBuoy, path: "/tickets" },
      { label: "Knowledge Base", icon: BookOpen, path: "/knowledge-base" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Reports", icon: BarChart3, path: "/reports" },
      { label: "Studio", icon: Puzzle, path: "/studio" },
      { label: "Settings", icon: Settings, path: "/settings" },
      { label: "Import Data", icon: Download, path: "/import" },
      { label: "Ad Integrations", icon: BarChart3, path: "/ads" },
      { label: "Website Crawler", icon: Globe, path: "/website-crawler" },
      { label: "Public Profile", icon: Building2, path: "/public-profile" },
    ],
  },
];

const nicheLabel = getLabel("leads");
const navGroups = rawNavGroups
  .map((g) => ({
    ...g,
    label: g.label === "Leads" ? nicheLabel : g.label,
    items: g.items.filter((item) => {
      const feature = featureMap[item.path];
      return !feature || isFeatureEnabled(feature as any);
    }).map((item) => {
      const labelKey = labelMap[item.path];
      if (labelKey) return { ...item, label: getLabel(labelKey) };
      if (item.path === "/leads") return { ...item, label: getLabel("lead") };
      return item;
    }),
  }))
  .filter((g) => g.items.length > 0);

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { logout } = useAuth();
  const branding = useBranding();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const findActiveGroupLabel = () => {
    const hash = window.location.hash.replace('#', '') || '/';
    const group = navGroups.find(g => g.items.some(item => hash === item.path || (item.path !== '/' && hash.startsWith(item.path))));
    return group?.label;
  };

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = findActiveGroupLabel();
    return new Set(active ? [active] : []);
  });
  const [activeHash, setActiveHash] = useState(() => window.location.hash);

  useEffect(() => {
    Promise.all([
      fetchProfile().catch(() => null),
      fetchBusinessSettings().catch(() => null),
    ]).then(([p, s]) => {
      setProfile(p);
      setSettings(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onHash = () => {
      setActiveHash(window.location.hash);
      const active = findActiveGroupLabel();
      if (active) setOpenGroups(prev => (prev.has(active) ? prev : new Set(prev).add(active)));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const companyName = settings?.businessName || profile?.tenant?.name || getBusinessName() || "LeadFlow";
  const initials = companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'BN';
  const userName = profile?.name || "User";
  const userEmail = profile?.email || "user@local";

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onMobileClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-transform duration-200 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--sidebar-border)] px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{getNicheLogo()}</span>
              <span className="text-sm font-bold text-[var(--sidebar-fg)]">{companyName}</span>
            </div>
          )}
          <button onClick={onToggle} className="rounded-md p-1.5 hover:bg-[var(--sidebar-hover)] text-[var(--sidebar-muted)] transition-colors">
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navGroups.map((group) => {
            const collapsible = group.items.length > 1;
            const isOpen = !collapsible || openGroups.has(group.label) || collapsed;
            return (
              <div key={group.label} className="pb-1">
                {!collapsed && (
                  collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold text-[var(--sidebar-muted)] uppercase tracking-wider hover:text-[var(--sidebar-fg)] transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <p className="px-2.5 text-[10px] font-semibold text-[var(--sidebar-muted)] uppercase tracking-wider mb-1">
                      {group.label}
                    </p>
                  )
                )}
                <div
                  className={`space-y-0.5 overflow-hidden transition-all duration-200 ease-out ${
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  {group.items.map((item) => {
                    const isActive = activeHash === `#${item.path}` || (!activeHash && item.path === "/");
                    return (
                      <a
                        key={item.path}
                        href={`#${item.path}`}
                        onClick={onMobileClose}
                        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all font-medium relative ${
                          isActive
                            ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)]"
                            : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-fg)]"
                        }`}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-[var(--sidebar-active-fg)]" />}
                        <item.icon size={17} strokeWidth={2} />
                        {!collapsed && <span>{item.label}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--sidebar-border)] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer">
            <div className="h-7 w-7 rounded-full bg-[var(--sidebar-active-fg)] flex items-center justify-center text-xs font-semibold text-[#08130f] shrink-0">
              {profile?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--sidebar-fg)] truncate">{userName}</p>
                <p className="text-xs text-[var(--sidebar-muted)] truncate">{userEmail}</p>
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); logout(); }}
              className="rounded-md p-1.5 hover:bg-red-500/10 text-[var(--sidebar-muted)] hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
