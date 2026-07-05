import React, { useState, useEffect } from 'react';
import { MessageCircle, Globe, CheckCircle, XCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWebhooks } from '../lib/data';

const channels = [
  {
    name: 'Telegram',
    icon: MessageCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    desc: 'Leads and notifications sent to your Telegram bot',
    auto: true,
  },
  {
    name: 'Chat Widget',
    icon: Globe,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    desc: 'Embeddable chat widget for your website',
    auto: true,
  },
];

export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);

  useEffect(() => {
    fetchWebhooks().then((r: any) => setWebhooks(r.data || r || [])).catch(() => {});
  }, []);

  const telegramWebhook = webhooks.find((w: any) => w.type === 'telegram');
  const telegramActive = telegramWebhook?.status === 'available' || telegramWebhook?.active;

  const embedCode = `<script src="https://deploysafe.in/widget/embed.js" data-widget-id="default"></script>`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Connected Channels</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Your channels are auto-configured — no setup needed</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Telegram */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${telegramActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'} flex items-center justify-center`}>
                <MessageCircle size={20} className={telegramActive ? 'text-blue-500' : 'text-gray-400'} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Telegram</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">@lead_automation_bot</p>
              </div>
            </div>
            {telegramActive ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle size={12} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <XCircle size={12} /> Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{channels[0].desc}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">Bot Token:</span>
            <code className="px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)]">configured in .env</code>
          </div>
        </div>

        {/* Chat Widget */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Globe size={20} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">Chat Widget</h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{channels[1].desc}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle size={12} /> Active
            </span>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Embed this script on your website:</p>
          <div className="relative mt-2">
            <pre className="text-xs text-[var(--foreground)] bg-[var(--muted)] rounded-lg p-3 overflow-x-auto border border-[var(--border)] whitespace-pre-wrap break-all">
              {embedCode}
            </pre>
            <button
              onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Copied!'); }}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
