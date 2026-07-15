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
import { isFeatureEnabled, getLabel, getBusinessName, getNicheLogo, onConfigChange } from "../../lib/niche-config";

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

function getNavGroups() {
  const nicheLabel = getLabel("leads");
  return rawNavGroups
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
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  const { logout } = useAuth();
  const branding = useBranding();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cfgRev, setCfgRev] = useState(0);

  useEffect(() => onConfigChange(() => setCfgRev(v => v + 1)), []);

  const findActiveGroupLabel = () => {
    const hash = window.location.hash.replace('#', '') || '/';
    const group = getNavGroups().find(g => g.items.some(item => hash === item.path || (item.path !== '/' && hash.startsWith(item.path))));
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
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-[var(--t-border-color-light)] bg-[var(--sidebar-bg)] transition-transform duration-200 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-14" : "lg:w-56"}`}
      >
        <div className="flex h-10 items-center justify-between px-2 pt-2 pb-1 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">{getNicheLogo()}</span>
              <span className="text-sm font-semibold text-[var(--t-font-color-primary)] truncate">{companyName}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 flex flex-col gap-1">
          {getNavGroups().map((group) => {
            const collapsible = group.items.length > 1;
            const isOpen = !collapsible || openGroups.has(group.label) || collapsed;
            return (
              <div key={group.label} className="pb-1">
                {!collapsed && (
                  collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between h-7 rounded-[var(--t-border-radius-md)] px-1 text-xs font-medium text-[var(--t-font-color-tertiary)] hover:text-[var(--t-font-color-secondary)] hover:bg-[var(--t-background-transparent-lighter)] transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  ) : (
                    <p className="px-1 text-xs font-medium text-[var(--t-font-color-tertiary)]">
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
                        className={`flex items-center gap-2.5 rounded-[var(--t-border-radius-md)] h-7 px-1 text-base transition-colors ${
                          isActive
                            ? "bg-[var(--t-background-transparent-light)] text-[var(--t-font-color-primary)] font-medium"
                            : "text-[var(--t-font-color-secondary)] hover:bg-[var(--t-background-transparent-light)] hover:text-[var(--t-font-color-primary)]"
                        }`}
                      >
                        <item.icon size={16} strokeWidth={1.5} className="shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[var(--t-border-color-light)] px-2 py-2 shrink-0">
          <div className="flex items-center gap-2 rounded-[var(--t-border-radius-md)] px-1 py-1 hover:bg-[var(--t-background-transparent-lighter)] transition-colors cursor-pointer">
            <div className="h-6 w-6 rounded-full bg-[var(--t-color-blue)] flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
              {profile?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--t-font-color-primary)] truncate">{userName}</p>
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); logout(); }}
              className="rounded p-1 hover:bg-red-500/10 text-[var(--t-font-color-tertiary)] hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
