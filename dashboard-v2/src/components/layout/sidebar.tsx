import {
  LayoutDashboard, Users, MessageSquare, BarChart3, Settings,
  Megaphone, FormInput, QrCode, FileText, Route, Target,
  ShoppingCart, Link, Calendar, Layers, ChevronLeft, ChevronRight,
  UserCircle, CheckSquare, Sparkles,
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
      { label: "AI Campaigns", icon: Sparkles, path: "/ai-campaigns" },
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

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: { collapsed: boolean; onToggle: () => void; mobileOpen?: boolean; onMobileClose?: () => void }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onMobileClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-200 lg:transition-[width] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-16" : "lg:w-64"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-[var(--primary)] flex items-center justify-center">
                <span className="text-[10px] font-bold text-[var(--primary-foreground)]">LA</span>
              </div>
              <span className="text-sm font-bold text-[var(--foreground)]">LeadAuto</span>
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
                <p className="px-2.5 text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
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
                          : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <item.icon size={17} strokeWidth={isActive ? 2.5 : 1.5} />
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
              A
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">Admin</p>
                <p className="text-xs text-[var(--muted-foreground)] truncate">admin@local</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
