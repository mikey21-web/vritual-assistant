import React, { useState, useEffect } from 'react';
import { Building2, Layers, CheckCircle, Globe } from 'lucide-react';
import { api } from '../lib/api';

export default function WorkspacePage() {
  const [niche, setNiche] = useState<any>(null);

  useEffect(() => {
    api('/niche-config').then(setNiche).catch(() => setNiche({ locked: false, reason: 'Config not loaded' }));
  }, []);

  if (!niche) return <div className="text-center text-[var(--muted-foreground)] py-20">Loading...</div>;
  if (!niche.locked) return (
    <div className="max-w-lg mx-auto text-center py-16">
      <Building2 size={48} className="mx-auto text-amber-400 mb-4" />
      <h2 className="font-semibold text-lg mb-2">No Workspace</h2>
      <p className="text-[var(--muted-foreground)] text-sm">{niche.reason || 'Niche config not yet loaded.'}</p>
    </div>
  );

  const config = niche.config || {};
  const branding = config.branding || {};
  const packs = config.packs || [];

  return (
    <div>
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 size={24} className="text-blue-700" />
          <div>
            <h2 className="font-semibold text-lg">{niche.displayName || config.niche?.display_name || 'Niche'}</h2>
            <div className="text-xs text-[var(--muted-foreground)]">
              <Globe size={10} className="inline mr-1" />
              {config.niche?.industry || 'N/A'} · Key: {config.niche?.key || 'N/A'}
            </div>
          </div>
          <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs flex items-center gap-1">
            <CheckCircle size={10} />Active
          </span>
        </div>
        {branding.primary_color && (
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: branding.primary_color }} />
            <span className="text-xs text-[var(--muted-foreground)]">{branding.primary_color}</span>
          </div>
        )}
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-medium text-sm mb-3">Configured Packs ({packs.length})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {packs.map((pack: any, i: number) => (
            <div key={i} className="flex items-center gap-1 bg-[var(--accent)] rounded px-2 py-1.5">
              <CheckCircle size={12} className="text-green-500" />
              {pack.type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
