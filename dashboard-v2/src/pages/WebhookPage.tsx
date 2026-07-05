import React, { useState, useEffect } from 'react';
import { fetchWebhooks, testWebhook } from '../lib/data';
import { Webhook, CheckCircle, XCircle, Clock, TestTube, ExternalLink, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const endpointInfo: Record<string, { label: string; description: string; auth: string; icon: string }> = {
  whatsapp: { label: 'WhatsApp', description: 'Meta WhatsApp Cloud API messages', auth: 'HMAC Signature (x-hub-signature-256)', icon: '💬' },
  telegram: { label: 'Telegram', description: 'Bot API updates', auth: 'Bot Token', icon: '✈️' },
  social: { label: 'Social Media', description: 'Facebook, Instagram, LinkedIn leads', auth: 'API Key (x-api-key)', icon: '📱' },
  voice: { label: 'Voice (Twilio)', description: 'Incoming call handling', auth: 'Twilio Signature', icon: '📞' },
  forms: { label: 'Forms', description: 'Custom form submissions', auth: 'API Key (x-api-key)', icon: '📝' },
  chatbot: { label: 'Chatbot', description: 'Chat widget messages', auth: 'API Key (x-api-key)', icon: '🤖' },
  'mobile-app': { label: 'Mobile App', description: 'App event forwarding', auth: 'API Key (x-api-key)', icon: '📲' },
  payments: { label: 'Payments', description: 'Stripe payment events', auth: 'Stripe Signature', icon: '💳' },
};

export default function WebhookPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [testing, setTesting] = useState<string | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchWebhooks().then((r: any) => {
      const data = r.data || r;
      if (Array.isArray(data)) {
        setWebhooks(data);
      } else {
        const types = Object.keys(endpointInfo);
        setWebhooks(types.map(t => ({
          type: t,
          url: `${API_URL}/webhooks/${t}`,
          ...endpointInfo[t],
          status: t === 'whatsapp' ? 'configured' : 'available',
          lastReceived: null,
        })));
      }
    }).catch(() => {
      const types = Object.keys(endpointInfo);
      setWebhooks(types.map(t => ({
        type: t,
        url: `${API_URL}/webhooks/${t}`,
        ...endpointInfo[t],
        status: 'available',
        lastReceived: null,
      })));
    });
  }, []);

  const handleTest = async (type: string) => {
    setTesting(type);
    try {
      await testWebhook(type);
      toast.success(`${endpointInfo[type]?.label || type} webhook test passed`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Webhook size={13} className="text-[var(--primary)]" />
          <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">Channels</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">Webhook Endpoints</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          {webhooks.length} endpoints configured — copy these URLs into your external services
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {webhooks.map((wh) => {
          const info = endpointInfo[wh.type] || { label: wh.type, description: '', auth: 'Unknown', icon: '🔗' };
          const isActive = wh.status === 'configured' || wh.status === 'active';
          const hasRecentActivity = wh.lastReceived && new Date(wh.lastReceived).getTime() > Date.now() - 86400000;

          return (
            <div key={wh.type} className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <h3 className="font-semibold text-sm text-[var(--foreground)]">{info.label}</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">{info.description}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {isActive ? <CheckCircle size={10} /> : <Clock size={10} />}
                  {isActive ? 'Active' : 'Available'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-16 shrink-0">URL</span>
                  <code className="flex-1 px-2 py-1 rounded bg-[var(--accent)] text-xs text-[var(--foreground)] font-mono truncate select-all">
                    {wh.url}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-16 shrink-0">Auth</span>
                  <div className="flex items-center gap-1.5">
                    <Shield size={10} className="text-[var(--muted-foreground)]" />
                    <span className="text-xs text-[var(--muted-foreground)]">{info.auth}</span>
                  </div>
                </div>
                {wh.lastReceived && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-16 shrink-0">Last Rx</span>
                    <span className={`text-xs ${hasRecentActivity ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                      {new Date(wh.lastReceived).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleTest(wh.type)}
                  disabled={testing === wh.type}
                  className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <TestTube size={12} />
                  {testing === wh.type ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(wh.url).then(() => toast.success('URL copied'))}
                  className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink size={12} />
                  Copy URL
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
