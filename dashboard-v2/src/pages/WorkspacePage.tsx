import React, { useState, useEffect } from 'react';
import { Building2, Layers, CheckCircle, Globe, Package } from 'lucide-react';
import { api } from '../lib/api';

export default function WorkspacePage() {
  const [niche, setNiche] = useState<any>(null);

  useEffect(() => {
    api('/niche-config').then(setNiche).catch(() => setNiche({ locked: false, reason: 'Config not loaded' }));
  }, []);

  if (!niche) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
    </div>
  );

  if (!niche.locked) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <Building2 size={32} className="text-amber-500" />
        </div>
        <h2 className="font-semibold text-lg text-[var(--foreground)] mb-2">No Workspace</h2>
        <p className="text-[var(--muted-foreground)] text-sm">{niche.reason || 'Niche config not yet loaded.'}</p>
      </div>
    );
  }

  const config = niche.config || {};
  const branding = config.branding || {};
  const packs = config.packs || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Workspace</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Your niche configuration</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-blue-700 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <Building2 size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">{niche.displayName || config.niche?.display_name || 'Niche'}</h2>
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mt-1">
                  <Globe size={14} />
                  {config.niche?.industry || 'N/A'} · Key: {config.niche?.key || 'N/A'}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle size={12} />
                Active
              </span>
            </div>
            {branding.primary_color && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border)]">
                <div className="h-5 w-5 rounded" style={{ backgroundColor: branding.primary_color }} />
                <span className="text-xs text-[var(--muted-foreground)]">{branding.primary_color}</span>
                {branding.logo_url && <span className="text-xs text-[var(--muted-foreground)]">· Logo configured</span>}
              </div>
            )}
            {config.niche?.timezone && (
              <div className="text-xs text-[var(--muted-foreground)] mt-2">
                Timezone: {config.niche.timezone}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Package size={16} className="text-[var(--primary)]" />
          Configured Packs ({packs.length})
        </h3>
        {packs.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No packs configured</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {packs.map((pack: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--muted)] px-3 py-2 border border-[var(--border)]">
                <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                <span className="text-sm text-[var(--foreground)]">{pack.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
