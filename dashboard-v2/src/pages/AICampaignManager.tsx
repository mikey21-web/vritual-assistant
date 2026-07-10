import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Sparkles, Send, Check, Edit3, X, Clock, Target, MessageSquare, DollarSign, TrendingUp, Users, BarChart3, ChevronDown, ChevronUp, Play, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AICampaignDraft } from '../lib/types';

export default function AICampaignManager() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<AICampaignDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<AICampaignDraft | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editableMessage, setEditableMessage] = useState('');
  const [editableName, setEditableName] = useState('');
  const [history, setHistory] = useState<AICampaignDraft[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = () => {
    api('/ai/campaigns').then((r: any) => {
      const list = r.data || r || [];
      setDrafts(list.filter((d: AICampaignDraft) => d.status === 'draft'));
      setHistory(list.filter((d: AICampaignDraft) => d.status === 'launched'));
    }).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const result = await api('/ai/campaigns/generate', { method: 'POST', body: JSON.stringify({ prompt: prompt.trim() }) });
      const draft = result as AICampaignDraft;
      setCurrentDraft(draft);
      setEditableMessage(draft.preview.message);
      setEditableName(draft.preview.name);
      setShowEditor(true);
      setPrompt('');
    } catch (e: any) {
      toast.error(e.message);
    }
    setGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); }
  };

  const launchCampaign = async () => {
    if (!currentDraft) return;
    try {
      const payload = { ...currentDraft, preview: { ...currentDraft.preview, message: editableMessage, name: editableName }, status: 'launched' };
      await api('/campaigns', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Campaign launched successfully!');
      setShowEditor(false);
      setCurrentDraft(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saveDraft = () => {
    if (!currentDraft) return;
    setCurrentDraft({ ...currentDraft, preview: { ...currentDraft.preview, message: editableMessage, name: editableName } });
    toast.success('Draft saved');
    setShowEditor(false);
    refresh();
  };

  const regenerate = () => {
    if (currentDraft) {
      setPrompt(currentDraft.prompt);
      setShowEditor(false);
      setCurrentDraft(null);
      setTimeout(() => generate(), 100);
    }
  };

  const examplePrompts = [
    'Diwali campaign for hot leads in Bangalore',
    'Follow-up for leads who opened but didn\'t reply',
    'WhatsApp broadcast for new property listing in Whitefield',
    'Re-engage cold leads who haven\'t replied in 30 days',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Sparkles size={13} className="text-amber-500" />
          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">AI Powered</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">AI Campaign Manager</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Describe your campaign in plain English — AI generates everything</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <BarChart3 size={14} />
              History ({history.length})
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your campaign... e.g. 'Diwali offer for hot leads in Bangalore with 25% discount'"
              className="w-full min-h-[60px] max-h-[120px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-none"
              rows={2}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {examplePrompts.slice(0, 3).map(ep => (
                <button
                  key={ep}
                  onClick={() => setPrompt(ep)}
                  className="px-2 py-1 rounded-md bg-[var(--muted)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/30 transition-colors"
                >
                  {ep.length > 35 ? ep.slice(0, 35) + '...' : ep}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="self-start h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 shrink-0"
          >
            {generating ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {generating ? 'Thinking...' : 'Generate'}
          </button>
        </div>
      </div>

      {showEditor && currentDraft && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-[var(--shadow-sm)] animate-scale-in">
          <div className="border-b border-[var(--border)] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-[var(--foreground)]">Campaign Preview</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">AI Generated</span>
            </div>
            <button onClick={() => { setShowEditor(false); setCurrentDraft(null); }} className="p-1 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1 block">Campaign Name</label>
                <input
                  value={editableName}
                  onChange={e => setEditableName(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                />
              </div>
              <div className="text-right shrink-0">
                <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1 block">Predicted ROI</label>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{currentDraft.preview.predictedROI}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] mb-1">
                  <Target size={12} /> Target
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{currentDraft.preview.segment.estimatedLeads} leads</div>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                  {currentDraft.preview.segment.filters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ')}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] mb-1">
                  <MessageSquare size={12} /> Channels
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">{currentDraft.preview.channels.join(' + ')}</div>
              </div>
              <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] mb-1">
                  <DollarSign size={12} /> Budget
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">₹{currentDraft.preview.budget.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)] mb-1">
                  <Clock size={12} /> Duration
                </div>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {Math.ceil((new Date(currentDraft.preview.schedule.end).getTime() - new Date(currentDraft.preview.schedule.start).getTime()) / 86400000)} days
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Message</label>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                  <Edit3 size={10} /> Editable
                </div>
              </div>
              <textarea
                value={editableMessage}
                onChange={e => setEditableMessage(e.target.value)}
                className="w-full min-h-[160px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-y"
                rows={8}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <button
                onClick={regenerate}
                className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              >
                Regenerate
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveDraft}
                  className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors flex items-center gap-1.5"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  onClick={launchCampaign}
                  className="h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Play size={14} /> Launch Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {drafts.length > 0 && !showEditor && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-1.5">
            <Save size={14} className="text-[var(--muted-foreground)]" />
            Saved Drafts ({drafts.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {drafts.map(draft => (
              <div
                key={draft.id}
                onClick={() => {
                  setCurrentDraft(draft);
                  setEditableMessage(draft.preview.message);
                  setEditableName(draft.preview.name);
                  setShowEditor(true);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{draft.preview.name}</h3>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">Draft</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-3">{draft.preview.message.slice(0, 120)}...</p>
                <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Target size={11} /> {draft.preview.segment.estimatedLeads}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> {draft.preview.channels.join('/')}</span>
                  <span className="flex items-center gap-1"><TrendingUp size={11} /> {draft.preview.predictedROI}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && showHistory && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-fade-in">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Launched Campaigns ({history.length})</h3>
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Channels</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">ROI</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{h.preview.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{h.preview.channels.join(' + ')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{h.preview.segment.estimatedLeads}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">₹{h.preview.budget.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{h.preview.predictedROI}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check size={10} /> Launched
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="block sm:hidden divide-y divide-[var(--border)]">
            {history.map(h => (
              <div key={h.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">{h.preview.name}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                    <Check size={10} /> Launched
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-[var(--muted-foreground)]">
                    <span className="block font-medium text-[var(--foreground)]">Channels</span>
                    {h.preview.channels.join(' + ')}
                  </div>
                  <div className="text-[var(--muted-foreground)]">
                    <span className="block font-medium text-[var(--foreground)]">Leads</span>
                    {h.preview.segment.estimatedLeads}
                  </div>
                  <div className="text-[var(--muted-foreground)]">
                    <span className="block font-medium text-[var(--foreground)]">Budget</span>
                    ₹{h.preview.budget.toLocaleString()}
                  </div>
                  <div className="text-[var(--muted-foreground)]">
                    <span className="block font-medium text-[var(--foreground)]">ROI</span>
                    <span className="text-emerald-600 font-semibold">{h.preview.predictedROI}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
