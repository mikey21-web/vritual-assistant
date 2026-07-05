import React, { useState, useEffect } from 'react';
import { fetchAgentStatus } from '../lib/data';
import { Code, Copy, Check, Eye, ExternalLink, Smartphone, Share2, Settings, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL || 'https://deploysafe.in';
const API_URL = PUBLIC_URL;
const DASHBOARD_URL = PUBLIC_URL;

export default function WidgetPage() {
  const [status, setStatus] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchAgentStatus().then(s => setStatus(s)).catch(() => setStatus({ online: false }));
  }, []);

  const bizName = status?.tone?.businessName || 'Your Business';
  const primaryColor = '#0d6b6b';

  const embedCode = `<!-- LeadFlow Chat Widget -->
<script>
window.LEADFLOW_URL = '${API_URL}';
window.LEADFLOW_PRIMARY = '${primaryColor}';
window.LEADFLOW_COMPANY = '${bizName}';
window.LEADFLOW_WELCOME = 'Hi there! 👋 Welcome to ${bizName}. How can I help you today?';
</script>
<script src="${DASHBOARD_URL}/widget/embed.js"></script>`;

  const widgetUrl = `${DASHBOARD_URL}/widget/demo.html`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(widgetUrl);
    toast.success('Widget link copied');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Code size={13} className="text-[var(--primary)]" />
          <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">Channels</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Chat Widget</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Embed this AI-powered chat widget on any website. Leads chat with your AI agent, get qualified, and pushed to CRM automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Code size={15} className="text-[var(--primary)]" />
              Embed Code
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-3">
              Copy and paste this code just before the <code className="text-[var(--primary)] bg-[var(--accent)] px-1 rounded">&lt;/body&gt;</code> tag on your website.
            </p>
            <div className="relative">
              <pre className="text-xs leading-relaxed bg-[var(--accent)] rounded-lg p-4 overflow-x-auto border border-[var(--border)] text-[var(--foreground)] whitespace-pre-wrap font-mono">
                {embedCode}
              </pre>
              <button
                onClick={copyEmbed}
                className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-[var(--card)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--accent)] transition-colors"
                title="Copy embed code"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-[var(--muted-foreground)]" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Settings size={15} className="text-[var(--primary)]" />
              Configuration
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Business Name</span>
                <span className="text-[var(--foreground)] font-medium">{bizName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Primary Color</span>
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded" style={{ backgroundColor: primaryColor }} />
                  <span className="text-[var(--foreground)] font-mono text-xs">{primaryColor}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Tone Style</span>
                <span className="text-[var(--foreground)] font-medium capitalize">{status?.tone?.style || 'professional'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[var(--muted-foreground)]">AI Agent</span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${status?.online ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status?.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {status?.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-4">
              Configure your agent's name, tone, and behavior in <a href="#/ai-agent" className="text-[var(--primary)] hover:underline">AI Agent settings</a>.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Smartphone size={15} className="text-[var(--primary)]" />
                Live Preview
              </h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 px-3 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1.5"
              >
                <Eye size={13} />
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPreview ? (
              <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-white" style={{ height: 520 }}>
                <iframe
                  src={widgetUrl}
                  className="w-full h-full border-0"
                  title="Widget Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)] p-8 text-center">
                <Smartphone size={40} className="mx-auto text-[var(--muted-foreground)] mb-3 opacity-40" />
                <p className="text-sm text-[var(--muted-foreground)] mb-1">Preview hidden</p>
                <p className="text-xs text-[var(--muted-foreground)] opacity-60">Click "Show" to preview the widget</p>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Share2 size={15} className="text-[var(--primary)]" />
              Share & Test
            </h3>
            <div className="space-y-3">
              <button
                onClick={copyLink}
                className="w-full h-9 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} />
                Copy Widget Demo Link
              </button>
              <a
                href={widgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-9 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Eye size={14} />
                Open Demo in New Tab
              </a>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <strong>Tip:</strong> Open the demo, click the chat bubble, and type a message. The AI agent will respond, create a lead in your dashboard, and store the conversation. Qualified leads can be pushed to CRM automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
