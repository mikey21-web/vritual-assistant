import React, { useState, useEffect } from 'react';
import { fetchIntegrations, createIntegration, updateIntegration } from '../lib/data';
import { API_URL } from '../lib/api';
import { MessageCircle, Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Integration } from '../lib/types';

function generateSiteKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'key-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function WebChatPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => fetchIntegrations().then((r: any) => setIntegrations(r.data || r)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const webchat = integrations.find(i => i.type === 'webchat');
  const siteKey = (webchat?.config as any)?.siteKey as string | undefined;

  const enable = async () => {
    setLoading(true);
    try {
      await createIntegration({ type: 'webchat', name: 'Web Chat Widget', config: { siteKey: generateSiteKey() }, isActive: true });
      refresh();
      toast.success('Web chat enabled');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const toggleActive = async () => {
    if (!webchat) return;
    try {
      await updateIntegration(webchat.id, { isActive: !webchat.isActive });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const regenerate = async () => {
    if (!webchat) return;
    if (!confirm('Regenerate the site key? Any widget already installed with the old key will stop working until you update the embed snippet.')) return;
    try {
      await updateIntegration(webchat.id, { config: { siteKey: generateSiteKey() } });
      refresh();
      toast.success('Site key regenerated');
    } catch (e: any) { toast.error(e.message); }
  };

  const snippet = siteKey
    ? `<script src="${window.location.origin}/widget.js" data-site-key="${siteKey}" data-api-url="${API_URL}"></script>`
    : '';

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Web Chat</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">An embeddable chat widget for your website, backed by the same AI assistant that handles WhatsApp and Telegram.</p>
      </div>

      {!webchat && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-[var(--muted)] flex items-center justify-center mx-auto mb-3">
            <MessageCircle size={20} className="text-[var(--muted-foreground)]" />
          </div>
          <h2 className="font-medium text-[var(--foreground)] mb-1">Web chat isn't enabled yet</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4 max-w-sm mx-auto">Enable it to get an embed snippet you can paste into your website. No developer needed after that.</p>
          <button
            onClick={enable}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          >
            Enable Web Chat
          </button>
        </div>
      )}

      {webchat && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${webchat.isActive ? 'bg-emerald-500' : 'bg-[var(--muted-foreground)]'}`} />
              <div>
                <div className="font-medium text-sm text-[var(--foreground)]">Web Chat Widget</div>
                <div className="text-xs text-[var(--muted-foreground)]">{webchat.isActive ? 'Active — accepting messages' : 'Disabled'}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleActive} className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
                {webchat.isActive ? 'Disable' : 'Enable'}
              </button>
              <button onClick={regenerate} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
                <RefreshCw size={12} /> Regenerate key
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[var(--foreground)]">Embed snippet</h3>
              <button onClick={() => copy(snippet, 'Snippet')} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors">
                <Copy size={12} /> Copy
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">Paste this right before the closing <code>&lt;/body&gt;</code> tag of your website.</p>
            <pre className="text-xs bg-[var(--muted)] text-[var(--foreground)] p-3 rounded-lg overflow-x-auto">{snippet}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
