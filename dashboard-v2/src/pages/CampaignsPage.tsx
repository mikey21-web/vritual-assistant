import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  fetchCampaigns, createCampaign, toggleCampaign, duplicateCampaign,
  startCampaign, pauseCampaign, completeCampaign, archiveCampaign,
} from '../lib/data';
import { consumePendingFilter, PENDING_FILTER_APPLIED_EVENT } from '../lib/pendingSearch';
import {
  Plus, Search, Megaphone, LayoutGrid, CalendarDays, BarChart3,
  RefreshCw, ChevronLeft, ChevronRight, Loader2, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CampaignCard from '../components/campaigns/CampaignCard';
import CampaignWizard from '../components/campaigns/CampaignWizard';
import CampaignSourceBreakdown from '../components/campaigns/CampaignSourceBreakdown';

type ViewMode = 'list' | 'calendar' | 'performance';
type StatusFilter = 'all' | 'draft' | 'active' | 'paused' | 'completed';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
];

function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`;
}

// ─── Mini Calendar View ───────────────────────────────────────────────────

function CalendarView({ campaigns, onSelect }: { campaigns: any[]; onSelect: (id: string) => void }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getCampaignsForDay = (day: number) => {
    return campaigns.filter((c) => {
      if (!c.startDate && !c.endDate) return false;
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : null;
      const date = new Date(currentYear, currentMonth, day);
      if (start && end) return date >= start && date <= end;
      if (start) return date.toDateString() === start.toDateString();
      if (end) return date.toDateString() === end.toDateString();
      return false;
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'paused': return 'bg-amber-500';
      case 'completed': return 'bg-blue-500';
      case 'draft': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)]">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)]">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--muted-foreground)] uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[80px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayCampaigns = getCampaignsForDay(day);
          const isToday = now.getDate() === day && now.getMonth() === currentMonth && now.getFullYear() === currentYear;
          return (
            <div
              key={day}
              className={`min-h-[80px] rounded-lg border border-[var(--border)] p-1 text-[10px] ${
                isToday ? 'border-[var(--primary)] bg-[var(--primary)]/5' : ''
              }`}
            >
              <span className={`font-medium ${isToday ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayCampaigns.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c.id)}
                    className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-medium text-white truncate ${statusColor(c.status || (c.active ? 'active' : 'paused'))}`}
                    title={c.name}
                  >
                    {c.name}
                  </button>
                ))}
                {dayCampaigns.length > 3 && (
                  <div className="text-[9px] text-[var(--muted-foreground)] px-1">
                    +{dayCampaigns.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Performance Overview ─────────────────────────────────────────────────

function PerformanceView({ campaigns, loading }: { campaigns: any[]; loading: boolean }) {
  const metrics = useMemo(() => {
    const totalActive = campaigns.filter((c) => c.status === 'active' || (c.active && !c.status)).length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadCount ?? c._count?.leads ?? 0), 0);
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent ?? 0), 0);
    const totalBudget = campaigns.reduce((sum, c) => sum + (c.totalBudget ?? 0), 0);
    const rates = campaigns
      .filter((c) => c.conversionRate != null && c.conversionRate > 0)
      .map((c) => c.conversionRate);
    const avgConversion = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    return { totalActive, totalLeads, avgConversion, totalSpent, totalBudget };
  }, [campaigns]);

  // Source aggregation
  const sourceData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    campaigns.forEach((c) => {
      (c.channels || []).forEach((ch: string) => {
        const key = ch.toLowerCase();
        sourceMap[key] = (sourceMap[key] || 0) + (c.leadCount ?? c._count?.leads ?? 0);
      });
    });
    if (Object.keys(sourceMap).length === 0) return [];
    return Object.entries(sourceMap).map(([source, count]) => ({ source, count }));
  }, [campaigns]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
              <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-1/3" />
              <div className="h-6 bg-[var(--muted)] rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const summaryCards = [
    { title: 'Total Active Campaigns', value: String(metrics.totalActive) },
    { title: 'Leads This Month', value: metrics.totalLeads.toLocaleString() },
    { title: 'Avg Conv Rate', value: metrics.avgConversion ? `${metrics.avgConversion.toFixed(1)}%` : '—' },
    { title: 'Total Spend', value: metrics.totalSpent ? formatCurrency(metrics.totalSpent) : '—' },
  ];

  const recentCampaigns = [...campaigns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.08em]">
              {card.title}
            </div>
            <div className="mt-2 text-xl font-bold text-[var(--foreground)]">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Source breakdown + Recent campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CampaignSourceBreakdown data={sourceData} />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Recent Campaigns</h3>
          {recentCampaigns.length === 0 ? (
            <div className="text-xs text-[var(--muted-foreground)]">No campaigns yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-2 pr-3 font-semibold text-[var(--muted-foreground)]">Name</th>
                    <th className="text-left py-2 pr-3 font-semibold text-[var(--muted-foreground)]">Status</th>
                    <th className="text-right py-2 pr-3 font-semibold text-[var(--muted-foreground)]">Leads</th>
                    <th className="text-right py-2 font-semibold text-[var(--muted-foreground)]">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCampaigns.map((c) => {
                    const s = c.status || (c.active ? 'active' : 'draft');
                    const statusColors: Record<string, string> = {
                      draft: 'text-gray-500', active: 'text-emerald-600',
                      paused: 'text-amber-600', completed: 'text-blue-600',
                      archived: 'text-slate-500',
                    };
                    return (
                      <tr key={c.id} className="border-b border-[var(--border)]/50">
                        <td className="py-2.5 pr-3 font-medium text-[var(--foreground)] truncate max-w-[140px]">{c.name}</td>
                        <td className={`py-2.5 pr-3 capitalize ${statusColors[s] || 'text-gray-500'}`}>{s}</td>
                        <td className="py-2.5 pr-3 text-right text-[var(--foreground)]">{c.leadCount ?? c._count?.leads ?? 0}</td>
                        <td className="py-2.5 text-right text-[var(--foreground)]">{c.spent ? formatCurrency(c.spent) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main CampaignsPage ───────────────────────────────────────────────────

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showWizard, setShowWizard] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (statusFilter !== 'all') {
        const cStatus = c.status || (c.active ? 'active' : 'paused');
        if (cStatus !== statusFilter) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q)
        || (c.description || '').toLowerCase().includes(q)
        || (c.campaignType || '').toLowerCase().includes(q);
    });
  }, [items, search, statusFilter]);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetchCampaigns();
      setItems(r.data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const applyPendingFilter = () => {
    const pending = consumePendingFilter('campaigns');
    if (!pending) return;
    setSearch(pending.filters?.search || '');
    setHighlightId(pending.highlightId || null);
  };

  useEffect(() => {
    applyPendingFilter();
    const onApplied = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'campaigns') applyPendingFilter();
    };
    window.addEventListener(PENDING_FILTER_APPLIED_EVENT, onApplied);
    return () => window.removeEventListener(PENDING_FILTER_APPLIED_EVENT, onApplied);
  }, []);

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId, items]);

  const handleNavigate = (campaign: any) => {
    window.location.hash = `/campaigns/${campaign.id}`;
  };

  const handleAction = async (action: string, campaign: any) => {
    try {
      switch (action) {
        case 'toggle': {
          const status = campaign.status || (campaign.active ? 'active' : 'paused');
          if (status === 'draft' || status === 'paused') {
            await startCampaign(campaign.id);
            toast.success('Campaign started');
          } else if (status === 'active') {
            await pauseCampaign(campaign.id);
            toast.success('Campaign paused');
          }
          break;
        }
        case 'start':
          await startCampaign(campaign.id);
          toast.success('Campaign started');
          break;
        case 'pause':
          await pauseCampaign(campaign.id);
          toast.success('Campaign paused');
          break;
        case 'complete':
          await completeCampaign(campaign.id);
          toast.success('Campaign completed');
          break;
        case 'archive':
          await archiveCampaign(campaign.id);
          toast.success('Campaign archived');
          break;
        case 'duplicate':
          await duplicateCampaign(campaign.id);
          toast.success('Campaign duplicated');
          break;
        case 'detail':
          handleNavigate(campaign);
          return;
      }
      refresh();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action} campaign`);
    }
  };

  // ── View mode tabs ──
  const viewTabs: { key: ViewMode; label: string; icon: React.ElementType }[] = [
    { key: 'list', label: 'List', icon: LayoutGrid },
    { key: 'calendar', label: 'Calendar', icon: CalendarDays },
    { key: 'performance', label: 'Performance', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-[var(--foreground)]">Campaigns</h1>
                  <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2.5 rounded-full text-xs font-semibold bg-[var(--primary)]/10 text-[var(--primary)]">
                    {items.length}
                  </span>
                </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {items.length > 0 ? `${filtered.length} of ${items.length} campaigns` : 'Manage your campaigns'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* View mode pills */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5 bg-[var(--background)]">
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setViewMode(tab.key)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === tab.key
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-sm'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={refresh}
            className="p-2 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* Search and filter bar - only for list view */}
      {viewMode === 'list' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-lg border border-[var(--input)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-full" />
                  <div className="h-2 bg-[var(--muted)] rounded animate-pulse w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-16 text-center">
              <Megaphone size={36} className="mx-auto text-[var(--muted-foreground)]/40 mb-3" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                {search || statusFilter !== 'all' ? 'No matching campaigns' : 'No campaigns yet'}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xs mx-auto">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Create your first campaign to start generating leads.'}
              </p>
              {!search && statusFilter === 'all' && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={15} /> Create Campaign
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((c: any) => (
                <div
                  key={c.id}
                  ref={highlightId === c.id ? highlightRef : undefined}
                >
                  <motion.div
                    animate={highlightId === c.id ? { backgroundColor: ['rgba(99,102,241,0.25)', 'rgba(99,102,241,0)', 'rgba(99,102,241,0.25)', 'rgba(99,102,241,0)'] } : undefined}
                    transition={highlightId === c.id ? { duration: 2.4, times: [0, 0.33, 0.66, 1] } : undefined}
                    className="rounded-xl"
                  >
                    <CampaignCard
                      campaign={c}
                      onAction={handleAction}
                      onClick={handleNavigate}
                    />
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarView campaigns={items} onSelect={(id) => window.location.hash = `/campaigns/${id}`} />
      )}

      {/* Performance Overview */}
      {viewMode === 'performance' && (
        <PerformanceView campaigns={items} loading={loading} />
      )}

      {/* Create Campaign Wizard */}
      <CampaignWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={refresh}
      />
    </div>
  );
}
