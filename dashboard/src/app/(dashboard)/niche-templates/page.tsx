'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Play, Eye, RefreshCw, X, Layers, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Template {
  id: string;
  key: string;
  name: string;
  description: string;
  industry: string;
  version: number;
  status: string;
  _count: { packs: number };
  createdAt: string;
}

interface Installation {
  id: string;
  clientKey: string;
  templateVersion: number;
  status: string;
  installedAt: string;
  errorMessage?: string;
  template: { key: string; name: string; industry: string };
}

interface DryRunResult {
  template: { key: string; name: string; version: number; industry: string };
  packs: number;
  totalRecords: number;
  breakdown: Record<string, { count: number; samples: any[] }>;
}

const PACK_LABELS: Record<string, string> = {
  custom_fields: 'Custom Fields',
  pipeline_stages: 'Pipeline Stages',
  campaigns: 'Campaigns',
  lead_forms: 'Lead Forms',
  message_templates: 'Message Templates',
  scoring_rules: 'Scoring Rules',
  routing_rules: 'Routing Rules',
  automation_rules: 'Automation Rules',
  nurture_sequences: 'Nurture Sequences',
  booking_settings: 'Booking Settings',
  crm_mappings: 'CRM Mappings',
  conversion_goals: 'Conversion Goals',
  dashboard_labels: 'Dashboard Labels',
  reports: 'Reports',
  saved_filters: 'Saved Filters',
  notification_rules: 'Notification Rules',
  sample_data: 'Sample Data',
};

const INDUSTRY_COLORS: Record<string, string> = {
  events: 'bg-pink-100 text-pink-700',
  real_estate: 'bg-blue-100 text-blue-700',
  education: 'bg-purple-100 text-purple-700',
  healthcare: 'bg-green-100 text-green-700',
  b2b: 'bg-indigo-100 text-indigo-700',
  finance: 'bg-amber-100 text-amber-700',
  legal: 'bg-gray-100 text-gray-700',
  travel: 'bg-cyan-100 text-cyan-700',
  construction: 'bg-orange-100 text-orange-700',
  automotive: 'bg-red-100 text-red-700',
  franchise: 'bg-teal-100 text-teal-700',
  saas: 'bg-sky-100 text-sky-700',
};

export default function NicheTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [tab, setTab] = useState<'templates' | 'installations'>('templates');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const fetchTemplates = () => api('/niche-templates').then(setTemplates).catch(e => toast.error(e.message));
  const fetchInstallations = () => api('/niche-templates/installations/all').then(setInstallations).catch(() => {});

  useEffect(() => { fetchTemplates(); fetchInstallations(); }, []);

  const grouped = templates.reduce((acc, t) => {
    if (!acc[t.industry]) acc[t.industry] = [];
    acc[t.industry].push(t);
    return acc;
  }, {} as Record<string, Template[]>);

  const filteredGroups = filter
    ? Object.fromEntries(
        Object.entries(grouped).map(([k, v]) => [k, v.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()) || t.key.toLowerCase().includes(filter.toLowerCase()))])
      )
    : grouped;

  const handleDryRun = async (id: string) => {
    setDryRunLoading(true);
    setDryRun(null);
    try {
      const result = await api(`/niche-templates/${id}/dry-run`, { method: 'POST', body: JSON.stringify({}) });
      setDryRun(result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDryRunLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    setApplyLoading(id);
    try {
      await api(`/niche-templates/${id}/apply`, { method: 'POST', body: JSON.stringify({}) });
      toast.success('Template applied successfully');
      fetchInstallations();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApplyLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    setPublishLoading(id);
    try {
      await api(`/niche-templates/${id}/publish`, { method: 'POST' });
      toast.success('Template published');
      fetchTemplates();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishLoading(null);
    }
  };

  const handleUpgrade = async (id: string) => {
    setUpgradeLoading(id);
    try {
      const result = await api(`/niche-templates/${id}/upgrade`, { method: 'POST', body: JSON.stringify({}) });
      toast.success(`Upgraded! ${result.newRecordsCreated} new records from ${result.newPacksInstalled} new packs.`);
      fetchInstallations();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpgradeLoading(null);
    }
  };

  const compactIndustry = (industry: string) => industry.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Niche Templates</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('templates')} className={clsx('px-3 py-1.5 rounded text-sm', tab === 'templates' ? 'bg-blue-600 text-white' : 'border')}>Templates</button>
          <button onClick={() => setTab('installations')} className={clsx('px-3 py-1.5 rounded text-sm', tab === 'installations' ? 'bg-blue-600 text-white' : 'border')}>
            Installations {installations.length > 0 && <span className="ml-1 text-xs opacity-75">({installations.length})</span>}
          </button>
        </div>
      </div>

      {tab === 'templates' && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input
              placeholder="Filter templates..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-64"
            />
            <div className="flex-1" />
          </div>

          {dryRun && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 relative">
              <button onClick={() => setDryRun(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              <div className="text-sm font-medium text-blue-800 mb-2">
                Dry Run: {dryRun.template.name} v{dryRun.template.version}
              </div>
              <div className="text-xs text-blue-600 mb-3">
                Would create <strong>{dryRun.totalRecords}</strong> records across <strong>{dryRun.packs}</strong> packs
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {Object.entries(dryRun.breakdown).map(([type, info]) => (
                  <div key={type} className="bg-white rounded px-2 py-1.5 text-xs border border-blue-100">
                    <div className="font-medium text-gray-700">{PACK_LABELS[type] || type}</div>
                    <div className="text-blue-600">{info.count} records</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {Object.entries(filteredGroups).map(([industry, items]) => (
              <div key={industry}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', INDUSTRY_COLORS[industry] || 'bg-gray-100 text-gray-700')}>
                    {compactIndustry(industry)}
                  </span>
                  <span className="text-xs text-gray-400">{items.length} template{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(t => {
                    const isExpanded = expandedId === t.id;
                    const installed = installations.filter(i => i.template.key === t.key && i.status === 'installed');
                    const hasNewVersion = installed.some(i => i.templateVersion < t.version && t.status === 'published');

                    return (
                      <div key={t.id} className={clsx('bg-white rounded-lg border shadow-sm transition-all', isExpanded && 'ring-2 ring-blue-200')}>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-sm">{t.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{t.key}</div>
                            </div>
                            <span className={clsx('px-1.5 py-0.5 rounded text-xs', t.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                              {t.status}
                            </span>
                          </div>

                          {t.description && <div className="text-xs text-gray-500 mb-2 line-clamp-2">{t.description}</div>}

                          <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                            <span className="flex items-center gap-1"><Layers size={12} />{t._count.packs} packs</span>
                            <span>v{t.version}</span>
                            {installed.length > 0 && <span className="text-green-600">✓ installed</span>}
                            {hasNewVersion && <span className="text-amber-600 flex items-center gap-0.5"><RefreshCw size={10} /> upgrade</span>}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleDryRun(t.id)}
                              disabled={dryRunLoading || t.status !== 'published'}
                              className="flex items-center gap-1 bg-white border rounded px-2.5 py-1 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {dryRunLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                              Preview
                            </button>
                            <button
                              onClick={() => handleApply(t.id)}
                              disabled={applyLoading === t.id || t.status !== 'published'}
                              className="flex items-center gap-1 bg-blue-600 text-white rounded px-2.5 py-1 text-xs hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {applyLoading === t.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                              Apply
                            </button>
                            {t.status !== 'published' && (
                              <button
                                onClick={() => handlePublish(t.id)}
                                disabled={publishLoading === t.id}
                                className="flex items-center gap-1 bg-green-600 text-white rounded px-2.5 py-1 text-xs hover:bg-green-700 disabled:opacity-40"
                              >
                                {publishLoading === t.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                Publish
                              </button>
                            )}
                            {hasNewVersion && (
                              <button
                                onClick={() => handleUpgrade(t.id)}
                                disabled={upgradeLoading === t.id}
                                className="flex items-center gap-1 bg-amber-600 text-white rounded px-2.5 py-1 text-xs hover:bg-amber-700 disabled:opacity-40"
                              >
                                {upgradeLoading === t.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                Upgrade
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs ml-auto"
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {isExpanded ? 'Less' : 'Packs'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                              {PACK_LABELS[t._count.packs > 0 ? 'message_templates' : 'message_templates'] && (
                                <div className="text-xs text-gray-400 col-span-2 mb-1">{t._count.packs} packs — expand to view types</div>
                              )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {templates.length === 0 && (
              <div className="text-center text-gray-400 py-12">Loading templates...</div>
            )}
            {templates.length > 0 && Object.values(filteredGroups).every(g => g.length === 0) && (
              <div className="text-center text-gray-400 py-12">No templates match &quot;{filter}&quot;</div>
            )}
          </div>
        </>
      )}

      {tab === 'installations' && (
        <div className="space-y-3">
          {installations.map(inst => (
            <div key={inst.id} className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{inst.template.name}</div>
                  <div className="text-xs text-gray-400">
                    Client: {inst.clientKey} · v{inst.templateVersion} · {inst.template.industry}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded text-xs', inst.status === 'installed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                    {inst.status === 'installed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {inst.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    {new Date(inst.installedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {inst.errorMessage && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2 flex items-start gap-1">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  {inst.errorMessage}
                </div>
              )}
            </div>
          ))}
          {installations.length === 0 && (
            <div className="text-center text-gray-400 py-12">No installations yet. Apply a template to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
