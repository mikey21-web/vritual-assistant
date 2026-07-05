import React, { useState, useEffect } from 'react';
import { fetchIntegrations, createIntegration, testIntegration, sendTestSMS } from '../lib/data';
import { Smartphone, Send, CheckCircle, XCircle, RefreshCw, Key, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SMSSettingsPage() {
  const [twilio, setTwilio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ accountSid: '', authToken: '', fromNumber: '' });
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test message from LeadAuto');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchIntegrations().then((r: any) => {
      const tw = (r.data || r || []).find((i: any) => i.type === 'TWILIO' || i.type === 'twilio');
      if (tw) {
        setTwilio(tw);
        setForm({
          accountSid: tw.config?.accountSid || '',
          authToken: tw.config?.authToken || '',
          fromNumber: tw.config?.fromNumber || '',
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (twilio) {
        await updateBusinessSettings({
          smsProvider: 'twilio',
          twilioAccountSid: form.accountSid,
          twilioAuthToken: form.authToken,
          twilioFromNumber: form.fromNumber,
        });
        setTwilio({
          ...twilio,
          status: 'configured',
          config: { accountSid: form.accountSid, fromNumber: form.fromNumber },
        });
      } else {
        const r = await createIntegration({
          type: 'TWILIO',
          name: 'Twilio SMS',
          config: { accountSid: form.accountSid, authToken: form.authToken, fromNumber: form.fromNumber },
        });
        setTwilio({ ...r, status: 'configured' });
      }
      setShowForm(false);
      toast.success('Twilio credentials saved');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) { toast.error('Enter a phone number'); return; }
    setTesting(true);
    try {
      const res = await sendTestSMS(testPhone, testMessage);
      toast.success(res?.status || res?.message || 'Test message sent!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 rounded-lg bg-[var(--card)] animate-pulse" />
      <div className="h-64 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Smartphone size={13} className="text-[var(--primary)]" />
          <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">Channels</span>
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">SMS Settings</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Configure Twilio SMS for automated text messaging</p>
      </div>

      {!twilio && !showForm && (
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-8 text-center shadow-[var(--shadow-sm)]">
          <Smartphone size={40} className="mx-auto text-[var(--muted-foreground)] mb-4" />
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">No SMS provider configured</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-4 max-w-sm mx-auto">
            Connect your Twilio account to send SMS messages to leads automatically through the AI agent and campaigns.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Key size={14} />
            Configure Twilio
          </button>
        </div>
      )}

      {(twilio || showForm) && (
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Settings size={15} className="text-[var(--primary)]" />
              Twilio Credentials
            </h3>
            {twilio?.status === 'connected' || twilio?.status === 'configured' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle size={10} /> Connected
              </span>
            ) : twilio?.status === 'error' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                <XCircle size={10} /> Error
              </span>
            ) : null}
          </div>

          {showForm ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Twilio Account SID</label>
                <input
                  value={form.accountSid}
                  onChange={e => setForm(p => ({ ...p, accountSid: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Auth Token</label>
                <input
                  type="password"
                  value={form.authToken}
                  onChange={e => setForm(p => ({ ...p, authToken: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  placeholder="Enter your Twilio Auth Token"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">From Phone Number</label>
                <input
                  value={form.fromNumber}
                  onChange={e => setForm(p => ({ ...p, fromNumber: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
                  {saving ? 'Saving...' : 'Save Credentials'}
                </button>
                {twilio && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-28 shrink-0">Account SID</span>
                  <code className="text-xs text-[var(--foreground)] font-mono">{twilio?.config?.accountSid?.slice(0, 6)}****</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-28 shrink-0">Auth Token</span>
                  <code className="text-xs text-[var(--foreground)] font-mono">••••••••••••••••</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider w-28 shrink-0">From Number</span>
                  <code className="text-xs text-[var(--foreground)] font-mono">{twilio?.config?.fromNumber || '-'}</code>
                </div>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="h-8 px-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1.5"
              >
                <Key size={12} />
                Edit Credentials
              </button>
            </>
          )}
        </div>
      )}

      {twilio && !showForm && (
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Send size={15} className="text-[var(--primary)]" />
            Test Send
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Recipient Phone</label>
              <input
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                placeholder="+1234567890"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Message</label>
              <textarea
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                className="w-full h-20 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-none"
              />
            </div>
            <button
              onClick={handleTest}
              disabled={testing || !testPhone.trim()}
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {testing ? 'Sending...' : 'Send Test SMS'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
