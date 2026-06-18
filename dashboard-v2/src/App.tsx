import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { Menu, X, Search } from 'lucide-react';
import { useAuth } from './lib/useAuth';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import LeadsPage from './pages/LeadsPage';
import ContactsPage from './pages/ContactsPage';
import CampaignsPage from './pages/CampaignsPage';
import FormsPage from './pages/FormsPage';
import QRCodesPage from './pages/QRCodesPage';
import MessagesPage from './pages/MessagesPage';
import LoginPage from './pages/LoginPage';
import CommandPalette from './components/CommandPalette';

const PageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  Templates: lazy(() => import('./pages/TemplatesPage')),
  Media: lazy(() => import('./pages/MediaPage')),
  Nurture: lazy(() => import('./pages/NurturePage')),
  Scoring: lazy(() => import('./pages/ScoringPage')),
  Routing: lazy(() => import('./pages/RoutingPage')),
  Tasks: lazy(() => import('./pages/TasksPage')),
  Conversions: lazy(() => import('./pages/ConversionsPage')),
  Integrations: lazy(() => import('./pages/IntegrationsPage')),
  CRM: lazy(() => import('./pages/CRMPage')),
  Booking: lazy(() => import('./pages/BookingPage')),
  Analytics: lazy(() => import('./pages/AnalyticsPage')),
  Team: lazy(() => import('./pages/TeamPage')),
  AuditLogs: lazy(() => import('./pages/AuditLogsPage')),
  Advanced: lazy(() => import('./pages/AdvancedPage')),
  Settings: lazy(() => import('./pages/SettingsPage')),
  Clients: lazy(() => import('./pages/ClientsPage')),
  NicheTemplates: lazy(() => import('./pages/NicheTemplatesPage')),
  Workspace: lazy(() => import('./pages/WorkspacePage')),
  Failures: lazy(() => import('./pages/FailuresPage')),
  Health: lazy(() => import('./pages/HealthPage')),
};

const pageMap: Record<string, any> = {
  Overview: OverviewPage, Leads: LeadsPage, Contacts: ContactsPage, Campaigns: CampaignsPage, Forms: FormsPage,
  'QR Codes': QRCodesPage, Messages: MessagesPage,
};

function DashboardContent() {
  const { user, isLoggedIn, logout, fetchProfile } = useAuth();
  const [page, setPage] = useState<any>('Overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(p => !p); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const renderPage = () => {
    const name = page.replace(/ /g, '');
    const LazyPage = PageComponents[name as keyof typeof PageComponents];
    const PageComponent = pageMap[page];
    if (PageComponent) return <PageComponent />;
    if (LazyPage) return <Suspense fallback={<div className="p-8 text-gray-400">Loading...</div>}><LazyPage /></Suspense>;
    return <OverviewPage />;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50/50 text-gray-800">
      <Toaster position="bottom-right" />
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-40 md:hidden" />}
      <div className={`fixed inset-y-0 left-0 z-50 md:static flex shrink-0 h-full transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:block'}`}>
        <Sidebar activePage={page} onNavigate={(p) => { setPage(p); setMobileOpen(false); }} isCollapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} userEmail={user?.email} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200/50 px-4 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-gray-500 p-1.5 border border-gray-200 rounded-lg">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <span className="text-xs font-semibold text-gray-800 font-mono uppercase hidden md:block">Lead Auto v2.4</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCommandOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
              <Search className="w-3.5 h-3.5" /> <span>Ctrl+K</span>
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Logout</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 container mx-auto max-w-7xl">{renderPage()}</main>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} leads={[]} campaigns={[]} settings={null as any} onNavigate={(p: any) => { setPage(p); setCommandOpen(false); }} />
    </div>
  );
}

export default function App() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <LoginPage />;
  return <AppProvider><DashboardContent /></AppProvider>;
}
