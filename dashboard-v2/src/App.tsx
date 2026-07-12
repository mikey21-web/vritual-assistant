import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./lib/useAuth";
import { AppProvider } from "./context/AppContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/layout/sidebar";
import { Topbar } from "./components/layout/topbar";
import { LoginPage } from "./pages/LoginPage";
import { Skeleton } from "./components/ui/skeleton";
import OverviewPage from "./pages/OverviewPage";
import LeadsPage from "./pages/LeadsPage";
import ContactsPage from "./pages/ContactsPage";
import CampaignsPage from "./pages/CampaignsPage";
import FormsPage from "./pages/FormsPage";
import QRCodesPage from "./pages/QRCodesPage";
import MessagesPage from "./pages/MessagesPage";

const PageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  Templates: lazy(() => import("./pages/TemplatesPage")),
  KnowledgeBase: lazy(() => import("./pages/KnowledgeBasePage")),
  WebChat: lazy(() => import("./pages/WebChatPage")),
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
  Failures: lazy(() => import("./pages/FailuresPage")),
  Health: lazy(() => import("./pages/HealthPage")),
  AICampaigns: lazy(() => import("./pages/AICampaignManager")),
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
  const map: Record<string, string> = {
    "/": "Overview", "/leads": "Leads", "/contacts": "Contacts",
    "/campaigns": "Campaigns", "/forms": "Forms", "/qr-codes": "QRCodes",
    "/conversations": "Messages", "/messages": "Messages",
    "/templates": "Templates", "/knowledge-base": "KnowledgeBase", "/media": "Media",
    "/nurture": "Nurture", "/scoring": "Scoring", "/rules": "Rules",
    "/tasks": "Tasks", "/conversions": "Conversions",
    "/integrations": "Integrations", "/crm": "CRM", "/booking": "Booking", "/web-chat": "WebChat",
    "/analytics": "Analytics", "/team": "Team",
    "/audit-logs": "AuditLogs", "/advanced": "Advanced",
    "/settings": "Settings", "/workspace": "Workspace",
    "/failures": "Failures", "/health": "Health",
    "/ai-campaigns": "AICampaigns",
  };
  return map[path] || "Overview";
}

const pageRoutes: Record<string, React.ComponentType<any>> = {
  Overview: OverviewPage, Leads: LeadsPage, Contacts: ContactsPage,
  Campaigns: CampaignsPage, Forms: FormsPage, QRCodes: QRCodesPage, Messages: MessagesPage,
};

export default function App() {
  const { user, login, logout, fetchProfile, isLoggedIn } = useAuth();
  const [page, setPage] = useState("Overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    fetchProfile();
    const onHash = () => {
      const hash = window.location.hash.replace("#", "") || "/";
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

  const navigate = (path: string) => {
    window.location.hash = path;
    setPage(getPageKey(path));
  };

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const PageComponent = pageRoutes[page] || PageComponents[page];

  return (
    <AppProvider>
      <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className={`flex flex-1 flex-col transition-all duration-200 ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}`}>
          <Topbar onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} dark={dark} onThemeToggle={() => setDark(!dark)} />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
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
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: 'var(--radius)', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px' },
        success: { iconTheme: { primary: '#0f766e', secondary: '#ffffff' } },
        error: { iconTheme: { primary: '#dc2626', secondary: '#ffffff' } },
      }} />
    </AppProvider>
  );
}
