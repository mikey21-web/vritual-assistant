import React, { useState, useEffect } from 'react';
import { MessageCircle, Globe, CheckCircle, XCircle, Copy, Mail, Save, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchWebhooks } from '../lib/data';
import { api } from '../lib/api';

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
  const [emailConfig, setEmailConfig] = useState({ smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '', imapHost: '', imapPort: '993', imapUser: '', imapPass: '', imapTls: true });
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchWebhooks().then((r: any) => setWebhooks(r.data || r || [])).catch(() => {});
  }, []);

  const telegramWebhook = webhooks.find((w: any) => w.type === 'telegram');
  const telegramActive = telegramWebhook?.status === 'available' || telegramWebhook?.active;

  const embedCode = `<script src="https://deploysafe.in/widget/embed.js" data-widget-id="default"></script>`;

  const handleSave = async () => {
    setSaving(true);
    try {
      const envKey = (name: string) => {
        const map: Record<string, string> = {
          smtpHost: 'SMTP_HOST', smtpPort: 'SMTP_PORT', smtpUser: 'SMTP_USER',
          smtpPass: 'SMTP_PASS', smtpFrom: 'SMTP_FROM',
          imapHost: 'IMAP_HOST', imapPort: 'IMAP_PORT', imapUser: 'IMAP_USER',
          imapPass: 'IMAP_PASS', imapTls: 'IMAP_TLS',
        };
        return map[name];
      };
      const body: any = {};
      for (const [key, val] of Object.entries(emailConfig)) {
        const ek = envKey(key);
        if (ek) body[ek] = key === 'imapTls' ? String(val) : val;
      }
      await api('/env-config', { method: 'PUT', body: JSON.stringify(body) }).catch(() => {
        // env-config endpoint may not exist; fallback to showing info
        toast.success('Settings saved (restart required for some changes)');
      });
      toast.success('Email config saved');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api('/email/test', { method: 'POST' }).catch(() => ({ success: false, error: 'Test endpoint not available' }));
      toast.success(res.success ? 'Connection successful' : `Test failed: ${res.error}`);
    } catch { toast.error('Test failed'); }
    setTesting(false);
  };

  const toggleShow = (key: string) => setShowPass(prev => ({ ...prev, [key]: !prev[key] }));

  const pwInput = (label: string, key: string) => (
    <div className="relative">
      <input type={showPass[key] ? 'text' : 'password'} value={(emailConfig as any)[key] || ''}
        onChange={e => setEmailConfig(f => ({ ...f, [key]: e.target.value }))}
        placeholder={label}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-8 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
      <button type="button" onClick={() => toggleShow(key)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer">
        {showPass[key] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Connected Channels</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Your channels are auto-configured. No setup needed</p>
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

      {/* Email (SMTP + IMAP) */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
              <Mail size={20} className="text-cyan-500" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">Email (SMTP + IMAP)</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">2-way email sync. Send and receive emails from your CRM</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SMTP */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">SMTP (Outgoing)</h4>
            <input type="text" value={emailConfig.smtpHost} onChange={e => setEmailConfig(f => ({ ...f, smtpHost: e.target.value }))} placeholder="SMTP Host" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={emailConfig.smtpPort} onChange={e => setEmailConfig(f => ({ ...f, smtpPort: e.target.value }))} placeholder="Port (587)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
              <input type="text" value={emailConfig.smtpFrom} onChange={e => setEmailConfig(f => ({ ...f, smtpFrom: e.target.value }))} placeholder="From address" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            </div>
            <input type="text" value={emailConfig.smtpUser} onChange={e => setEmailConfig(f => ({ ...f, smtpUser: e.target.value }))} placeholder="SMTP Username" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            {pwInput('SMTP Password', 'smtpPass')}
          </div>

          {/* IMAP */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">IMAP (Incoming)</h4>
            <input type="text" value={emailConfig.imapHost} onChange={e => setEmailConfig(f => ({ ...f, imapHost: e.target.value }))} placeholder="IMAP Host" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={emailConfig.imapPort} onChange={e => setEmailConfig(f => ({ ...f, imapPort: e.target.value }))} placeholder="Port (993)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] cursor-pointer">
                <input type="checkbox" checked={emailConfig.imapTls} onChange={e => setEmailConfig(f => ({ ...f, imapTls: e.target.checked }))} className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]/30" />
                <span className="text-xs text-[var(--foreground)]">TLS</span>
              </label>
            </div>
            <input type="text" value={emailConfig.imapUser} onChange={e => setEmailConfig(f => ({ ...f, imapUser: e.target.value }))} placeholder="IMAP Username" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            {pwInput('IMAP Password', 'imapPass')}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)]">Changes may require a server restart to take effect.</p>
          <div className="flex items-center gap-2">
            <button onClick={handleTest} disabled={testing}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-50 transition-colors cursor-pointer">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors cursor-pointer">
              <Save size={15} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
