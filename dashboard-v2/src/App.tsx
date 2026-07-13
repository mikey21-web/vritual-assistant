import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "./lib/useAuth";
import { AppProvider } from "./context/AppContext";
import { BrandingProvider } from "./lib/useBranding";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { getPrimaryColor } from "./lib/niche-config";
import { Sidebar } from "./components/layout/sidebar";
import { Topbar } from "./components/layout/topbar";
import MikeyWidget from "./components/MikeyWidget";
import ExplainModePlayer from "./components/ExplainModePlayer";
import { MikeyBanner, showMikeyToast } from "./components/mikey";
import { SocketProvider, useSocket } from "./hooks";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import { Skeleton } from "./components/ui/skeleton";
import OverviewPage from "./pages/OverviewPage";
import LeadsPage from "./pages/LeadsPage";
import ContactsPage from "./pages/ContactsPage";
import CampaignsPage from "./pages/CampaignsPage";
import FormsPage from "./pages/FormsPage";
import QRCodesPage from "./pages/QRCodesPage";
import MessagesPage from "./pages/MessagesPage";
import SyncLogPage from "./pages/SyncLogPage";
import PublicOrgPage from "./pages/PublicOrgPage";

const PageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  Pipeline: lazy(() => import("./pages/PipelinePage")),
  Templates: lazy(() => import("./pages/TemplatesPage")),
  Media: lazy(() => import("./pages/MediaPage")),
  Nurture: lazy(() => import("./pages/NurturePage")),
  Scoring: lazy(() => import("./pages/ScoringPage")),
  Routing: lazy(() => import("./pages/RoutingPage")),
  Tasks: lazy(() => import("./pages/TasksPage")),
  Conversions: lazy(() => import("./pages/ConversionsPage")),
  Integrations: lazy(() => import("./pages/IntegrationsPage")),
  CRM: lazy(() => import("./pages/CRMPage")),
  Booking: lazy(() => import("./pages/BookingPage")),
  Analytics: lazy(() => import("./pages/AnalyticsPage")),
  Team: lazy(() => import("./pages/TeamPage")),
  AuditLogs: lazy(() => import("./pages/AuditLogsPage")),
  Advanced: lazy(() => import("./pages/AdvancedPage")),
  Settings: lazy(() => import("./pages/SettingsPage")),
  Workspace: lazy(() => import("./pages/WorkspacePage")),
  AdIntegrations: lazy(() => import("./pages/AdIntegrationsPage")),
  Failures: lazy(() => import("./pages/FailuresPage")),
  Health: lazy(() => import("./pages/HealthPage")),
  WebsiteCrawler: lazy(() => import("./pages/WebsiteCrawlerPage")),
  AICampaigns: lazy(() => import("./pages/AICampaignManager")),
  Rules: lazy(() => import("./pages/RulesPage")),
  Import: lazy(() => import("./pages/ImportPage")),
  AIAgent: lazy(() => import("./pages/AIAgentPage")),
  Webhooks: lazy(() => import("./pages/WebhookPage")),
  SMS: lazy(() => import("./pages/SMSSettingsPage")),
  Widget: lazy(() => import("./pages/WidgetPage")),
  Tickets: lazy(() => import("./pages/TicketsPage")),
  Calls: lazy(() => import("./pages/CallsPage")),
  KnowledgeBase: lazy(() => import("./pages/KnowledgeBasePage")),
  Copilot: lazy(() => import("./pages/CopilotPage")),
  Mikey: lazy(() => import("./pages/MikeyPage")),
  Studio: lazy(() => import("./pages/StudioPage")),
  Reports: lazy(() => import("./pages/ReportsPage")),
  Events: lazy(() => import("./pages/EventsPage")),
  EventDetail: lazy(() => import("./pages/EventDetailPage")),
  EventCalendar: lazy(() => import("./pages/CalendarPage")),
  CreateEvent: lazy(() => import("./pages/CreateEventPage")),
  Accounting: lazy(() => import("./pages/AccountingPage")),
  Invoices: lazy(() => import("./pages/InvoicesPage")),
  Quotations: lazy(() => import("./pages/QuotationsPage")),
  Contracts: lazy(() => import("./pages/ContractsPage")),
  FinanceReports: lazy(() => import("./pages/FinanceReportsPage")),
  Partners: lazy(() => import("./pages/PartnersPage")),
  VendorBookings: lazy(() => import("./pages/VendorBookingsPage")),
  PurchaseOrders: lazy(() => import("./pages/PurchaseOrdersPage")),
  InventoryItems: lazy(() => import("./pages/InventoryPage")),
  StockMovements: lazy(() => import("./pages/StockMovementsPage")),
  Locations: lazy(() => import("./pages/LocationsPage")),
  LeaveLog: lazy(() => import("./pages/LeaveLogPage")),
  Salaries: lazy(() => import("./pages/SalariesPage")),
  Timesheet: lazy(() => import("./pages/TimesheetPage")),
  PublicProfile: lazy(() => import("./pages/PublicProfilePage")),
};

function PageFallback() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <Skeleton className="h-4 w-72 rounded-lg" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg mt-4" />
    </div>
  );
}

function getPageKey(path: string): string {
  if (/^\/events\/[^/]+$/.test(path)) return "EventDetail";
  if (path.startsWith("/create-event")) return "CreateEvent";
  const map: Record<string, string> = {
    "/": "Overview", "/leads": "Leads", "/pipeline": "Pipeline", "/contacts": "Contacts",
    "/campaigns": "Campaigns", "/forms": "Forms", "/qr-codes": "QRCodes",
    "/conversations": "Messages", "/messages": "Messages",
    "/templates": "Templates", "/media": "Media",
    "/nurture": "Nurture", "/scoring": "Scoring", "/rules": "Rules",
    "/tasks": "Tasks", "/conversions": "Conversions",
    "/integrations": "Integrations", "/crm": "CRM", "/booking": "Booking",
    "/analytics": "Analytics", "/team": "Team",
    "/audit-logs": "AuditLogs", "/advanced": "Advanced",
    "/settings": "Settings", "/workspace": "Workspace",     "/import": "Import", "/website-crawler": "WebsiteCrawler",
    "/failures": "Failures", "/health": "Health",
    "/ai-campaigns": "AICampaigns", "/ai-agent": "AIAgent",
    "/webhooks": "Webhooks", "/sms": "SMS", "/widget": "Widget", "/ads": "AdIntegrations",
    "/tickets": "Tickets",     "/calls": "Calls", "/sync-logs": "SyncLogs", "/knowledge-base": "KnowledgeBase",
    "/copilot": "Mikey", "/mikey": "Mikey",    "/studio": "Studio", "/reports": "Reports",
    "/events": "Events", "/calendar": "EventCalendar",
    "/accounting": "Accounting", "/invoices": "Invoices", "/quotations": "Quotations",
    "/contracts": "Contracts", "/finance-reports": "FinanceReports",
    "/partners": "Partners", "/vendor-bookings": "VendorBookings", "/purchase-orders": "PurchaseOrders",
    "/inventory": "InventoryItems", "/stock-movements": "StockMovements", "/locations": "Locations",
    "/leave-log": "LeaveLog", "/salaries": "Salaries", "/timesheet": "Timesheet",
    "/public-profile": "PublicProfile",
  };
  return map[path] || "Overview";
}

const pageRoutes: Record<string, React.ComponentType<any>> = {
  Overview: OverviewPage, Leads: LeadsPage, Contacts: ContactsPage,
  Campaigns: CampaignsPage, Forms: FormsPage, QRCodes: QRCodesPage, Messages: MessagesPage,
  SyncLogs: SyncLogPage,
};

function MikeyConnectedBanner() {
  const { eventBuffer } = useSocket();
  const findings = eventBuffer
    .filter(e => e.type.startsWith('mikey.'))
    .slice(-5)
    .map(e => ({
      id: `${e.type}-${e.timestamp}`,
      severity: ((e.payload as any)?.severity === 'critical' ? 'critical' : (e.payload as any)?.severity === 'warning' ? 'warning' : 'info') as 'info' | 'warning' | 'critical',
      title: (e.payload as any)?.title || e.type,
      description: (e.payload as any)?.description || '',
      timestamp: new Date(e.timestamp),
    }));
  return <MikeyBanner findings={findings} />;
}

function MikeyConnectedToast() {
  const { lastEvent } = useSocket();
  useEffect(() => {
    if (!lastEvent || !lastEvent.type.startsWith('mikey.')) return;
    const p = lastEvent.payload as any;
    if (!p?.title) return;
    showMikeyToast({
      title: p.title,
      description: p.description || '',
      severity: p.severity === 'critical' ? 'critical' : p.severity === 'warning' ? 'warning' : 'info',
    });
  }, [lastEvent]);
  return null;
}

export default function App() {
  const { user, login, logout, fetchProfile, isLoggedIn } = useAuth();
  const [page, setPage] = useState("Overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [publicRoute, setPublicRoute] = useState(() => window.location.hash.replace("#", "") || "/");

  useEffect(() => {
    fetchProfile();
    const onHash = () => {
      const hash = window.location.hash.replace("#", "") || "/";
      setPublicRoute(hash);
      setPage(getPageKey(hash));
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const color = getPrimaryColor();
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--ring", color);
    document.documentElement.style.setProperty("--primary-light", `${color}22`);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setPage(getPageKey(path));
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    window.location.hash = '/';
  };

  // Public microsite route — must be checked before the isLoggedIn gate below,
  // since it's meant to be viewable by anyone, logged in or not.
  if (publicRoute.startsWith('/org/')) {
    const slug = publicRoute.slice('/org/'.length);
    return <PublicOrgPage slug={slug} />;
  }

  if (!isLoggedIn) {
    return (
      <BrandingProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<LandingPage onLogin={() => { window.location.hash = '/login'; }} />} />
          </Routes>
        </HashRouter>
      </BrandingProvider>
    );
  }

  const PageComponent = pageRoutes[page] || PageComponents[page];

  return (
    <BrandingProvider>
    <AppProvider>
    <SocketProvider>
      <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className={`flex flex-1 flex-col transition-all duration-200 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}>
          <Topbar onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} dark={dark} onThemeToggle={() => setDark(!dark)} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 relative">
            <MikeyConnectedBanner />
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                {PageComponent ? <PageComponent /> : (
                  <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">Page not found</div>
                )}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <MikeyWidget />
      <ExplainModePlayer />
      <MikeyConnectedToast />
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: 'var(--radius)', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px' },
        success: { iconTheme: { primary: '#0f766e', secondary: '#ffffff' } },
        error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
      }} />
    </SocketProvider>
    </AppProvider>
    </BrandingProvider>
  );
}
