import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, MessageSquare, BarChart3, Settings,
  Megaphone, FormInput, QrCode, FileText, Route, Target,
  ShoppingCart, Link, Calendar, Layers, ChevronLeft, ChevronRight,
  UserCircle, CheckSquare, Sparkles, Phone,   Bot, MessageCircle, Smartphone, Webhook, Globe, LogOut, Columns3,
  LifeBuoy, BookOpen, Puzzle, Download,
} from "lucide-react";
import { fetchProfile, fetchBusinessSettings } from "../../lib/data";
import { useAuth } from "../../lib/useAuth";
import { useBranding } from "../../lib/useBranding";
import BrandLogo from "../BrandLogo";
import { isFeatureEnabled, getLabel, getBusinessName } from "../../lib/niche-config";

const featureMap: Record<string, string> = {
  "/nurture": "nurture", "/scoring": "scoring", "/rules": "routing",
  "/crm": "crm", "/booking": "booking", "/tickets": "tickets",
  "/knowledge-base": "knowledgeBase", "/media": "media", "/qr-codes": "qrCodes", "/reports": "reports",
  "/campaigns": "campaigns", "/forms": "forms",
  "/conversations": "messages", "/templates": "templates",
  "/ai-campaigns": "aiCampaigns", "/ai-agent": "aiAgent", "/copilot": "copilot",
  "/webhooks": "webhooks", "/sms": "sms", "/widget": "widget",
  "/tasks": "tasks", "/integrations": "integrations",
  "/analytics": "analytics", "/studio": "studio",
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
      { label: "Copilot", icon: Sparkles, path: "/copilot" },
    ],
  },
  {
    label: "Channels",
    items: [
      { label: "Webhooks", icon: Webhook, path: "/webhooks" },
      { label: "SMS", icon: Smartphone, path: "/sms" },
      { label: "Chat Widget", icon: Globe, path: "/widget" },
      { label: "Phone Calls", icon: Phone, path: "/integrations" },
      { label: "Social Media", icon: MessageCircle, path: "/integrations" },
      { label: "Mobile App", icon: Smartphone, path: "/integrations" },
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

  const companyName = settings?.businessName || profile?.tenant?.name || getBusinessName() || "LeadFlow";
  const initials = companyName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'BN';
  const userName = profile?.name || "User";
  const userEmail = profile?.email || "user@local";

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onMobileClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-transform duration-200 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <BrandLogo logoUrl={branding.logoUrl} name={companyName} />
              <span className="text-sm font-bold text-[var(--foreground)]">{companyName}</span>
            </div>
          )}
          <button onClick={onToggle} className="rounded-md p-1.5 hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors">
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="px-2.5 text-[10px] font-bold text-[var(--foreground)]/60 uppercase tracking-wider mb-1">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = window.location.hash === `#${item.path}` || (!window.location.hash && item.path === "/");
                  return (
                    <a
                      key={item.path}
                      href={`#${item.path}`}
                      onClick={onMobileClose}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all ${
                        isActive
                          ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold"
                          : "text-[var(--foreground)]/70 hover:bg-[var(--accent)] hover:text-[var(--foreground)] font-medium"
                      }`}
                    >
                      <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--accent)] transition-colors cursor-pointer">
            <div className="h-7 w-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-medium text-[var(--primary-foreground)] shrink-0">
              {profile?.name?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{userName}</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">{userEmail}</p>
              </div>
            )}
            <button
              onClick={(e) => { e.preventDefault(); logout(); }}
              className="rounded-md p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 text-[var(--muted-foreground)] hover:text-red-600 transition-colors"
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
