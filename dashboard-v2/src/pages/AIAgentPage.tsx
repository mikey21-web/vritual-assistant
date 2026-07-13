import React, { useState, useEffect } from 'react';
import { fetchAgentStatus, fetchAgentStats, testAgent, updateAgentConfig, fetchMessages } from '../lib/data';
import { Bot, Activity, CheckCircle, Calendar, Send, RefreshCw, Settings, MessageSquare, Wrench, AlertTriangle, MessageCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAgentPage() {
  const [status, setStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [testMsg, setTestMsg] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'configure' | 'conversations'>('overview');
  const [config, setConfig] = useState({ businessName: '', industry: '', toneStyle: '', customPrompt: '', qualificationQuestions: [''] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAgentStatus().catch(() => null),
      fetchAgentStats().catch(() => null),
      fetchMessages().then((r: any) => {
        const agentMsgs = (r.data || r || []).filter((m: any) =>
          m.channel === 'CHATBOT' || m.channel === 'WHATSAPP'
        ).slice(0, 20);
        setConversations(agentMsgs);
      }).catch(() => setConversations([])),
    ]).then(([s, st]) => {
      if (!s && !st) setError('Failed to load agent data. The backend may be unavailable.');
      setStatus(s);
      setStats(st);
    });
  }, []);

  useEffect(() => {
    if (status?.tone) {
      setConfig({
        businessName: status.tone.businessName || '',
        industry: status.tone.industry || '',
        toneStyle: status.tone.style || 'professional',
        customPrompt: status.tone.customPrompt || '',
        qualificationQuestions: status.qualificationQuestions?.length ? status.qualificationQuestions : [''],
      });
    }
  }, [status]);

  const handleTest = async () => {
    if (!testMsg.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const r = await testAgent(testMsg);
      setTestResult(r.response || r.message || 'No response');
      toast.success('Agent responded');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const cleanQuestions = config.qualificationQuestions.filter(q => q.trim());
      await updateAgentConfig({
        businessName: config.businessName,
        industry: config.industry,
        toneStyle: config.toneStyle,
        customPrompt: config.customPrompt,
        qualificationQuestions: cleanQuestions,
      });
      toast.success('Agent configuration saved');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => setConfig(p => ({ ...p, qualificationQuestions: [...p.qualificationQuestions, ''] }));
  const removeQuestion = (i: number) => setConfig(p => ({
    ...p,
    qualificationQuestions: p.qualificationQuestions.filter((_, idx) => idx !== i),
  }));
  const updateQuestion = (i: number, v: string) => setConfig(p => ({
    ...p,
    qualificationQuestions: p.qualificationQuestions.map((q, idx) => idx === i ? v : q),
  }));

  const statCards = [
    { label: 'Conversations Handled', value: stats?.conversationsHandled ?? 0, icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Leads Qualified', value: stats?.leadsQualified ?? 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Appointments Booked', value: stats?.appointmentsBooked ?? 0, icon: Calendar, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ];

  if (!status) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-48 rounded-lg bg-[var(--card)] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-lg bg-[var(--card)] border border-[var(--border)] animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {error && !status?.online && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">Connection Error</p>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Bot size={13} className="text-[var(--primary)]" />
            <span className="text-[11px] font-medium text-[var(--primary)] uppercase tracking-wider">AI Automation</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">AI Agent</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Model: {status.model || 'gemini-2.5-flash'} &middot;
            <span className={`ml-1.5 inline-flex items-center gap-1 ${status.online ? 'text-emerald-600' : 'text-rose-600'}`}>
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status.online ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${status.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              </span>
              {status.online ? 'Online' : 'Offline'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['overview', 'conversations', 'configure'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--accent)]'
              }`}
            >
              {t === 'overview' ? 'Overview' : t === 'conversations' ? 'Conversations' : 'Configure'}
            </button>
          ))}
        </div>
      </div>

      {!status.apiKeyConfigured && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <Wrench size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">API key not configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">Set GOOGLE_API_KEY or OPENAI_API_KEY in your environment to enable the AI agent.</p>
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {statCards.map((c) => (
              <div key={c.label} className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <c.icon size={18} className={c.color} />
                  </div>
                </div>
                <div className="text-xl font-bold text-[var(--foreground)]">{c.value.toLocaleString()}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Send size={15} className="text-[var(--primary)]" />
              Test Agent
            </h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                placeholder="Type a test message your leads might send..."
                className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                onKeyDown={e => e.key === 'Enter' && handleTest()}
              />
              <button
                onClick={handleTest}
                disabled={testing || !testMsg.trim()}
                className="h-10 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
              >
                {testing ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                {testing ? 'Sending...' : 'Send'}
              </button>
            </div>
            {testResult && (
              <div className="mt-4 p-4 rounded-lg bg-[var(--accent)] border border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Agent Response:</p>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{testResult}</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'conversations' && (
        <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)]">Recent Agent Conversations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Lead</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Channel</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Last Message</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {conversations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <MessageCircle size={32} className="mx-auto text-[var(--muted-foreground)] mb-3 opacity-40" />
                      <p className="text-sm font-medium text-[var(--foreground)] mb-1">No conversations yet</p>
                      <p className="text-xs text-[var(--muted-foreground)] mb-3 max-w-xs mx-auto">
                        Conversations handled by the AI agent will appear here once leads start messaging via WhatsApp, Chatbot, or other channels.
                      </p>
                      <button
                        onClick={() => { setActiveTab('overview'); scrollTo(0, 0); }}
                        className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:opacity-80 font-medium"
                      >
                        Test the agent <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ) : (
                  conversations.map((msg: any) => (
                    <tr key={msg.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                      <td className="px-5 py-3 text-sm text-[var(--foreground)]">
                        {msg.lead?.contact?.name || `Lead ${msg.leadId?.slice(-6)}`}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]">
                          {msg.channel}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--muted-foreground)] max-w-[300px] truncate">{msg.text}</td>
                      <td className="px-5 py-3 text-xs text-[var(--muted-foreground)]">
                        {new Date(msg.createdAt).toLocaleDateString()} {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-medium ${msg.direction === 'INBOUND' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {msg.direction === 'INBOUND' ? 'Received' : 'Sent'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'configure' && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Settings size={15} className="text-[var(--primary)]" />
              Business & Tone
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Business Name</label>
                <input
                  value={config.businessName}
                  onChange={e => setConfig(p => ({ ...p, businessName: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Industry</label>
                <input
                  value={config.industry}
                  onChange={e => setConfig(p => ({ ...p, industry: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  placeholder="e.g. Real Estate, Healthcare, SaaS"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">Tone Style</label>
                <select
                  value={config.toneStyle}
                  onChange={e => setConfig(p => ({ ...p, toneStyle: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                  Custom Prompt <span className="text-[var(--muted-foreground)] font-normal">(use &#123;message&#125;, &#123;businessName&#125;, &#123;industry&#125; as variables)</span>
                </label>
                <textarea
                  value={config.customPrompt}
                  onChange={e => setConfig(p => ({ ...p, customPrompt: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-vertical"
                  placeholder="e.g. Hey {message} 🤙 Welcome to {businessName}! How can I help you today?"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[var(--card)] border border-[var(--border)] p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <Activity size={15} className="text-[var(--primary)]" />
                Qualification Questions
              </h3>
              <button onClick={addQuestion} className="text-xs text-[var(--primary)] hover:opacity-80 font-medium">
                + Add Question
              </button>
            </div>
            <div className="space-y-2">
              {config.qualificationQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={q}
                    onChange={e => updateQuestion(i, e.target.value)}
                    className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    placeholder="e.g. What's your budget range?"
                  />
                  {config.qualificationQuestions.length > 1 && (
                    <button
                      onClick={() => removeQuestion(i)}
                      className="h-9 w-9 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-rose-600 transition-colors"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Settings size={14} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}
