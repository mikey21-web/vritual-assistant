import { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { copilotChat } from '../lib/data';
import toast from 'react-hot-toast';

interface CopilotMessage {
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_KEY = 'copilot_open';

/**
 * Always-available AI copilot for the owner/team — a chat panel over live
 * CRM data, distinct from the lead-facing agent. Mounted once at the app
 * root so it persists across page navigation.
 */
export function CopilotPanel() {
  const [open, setOpen] = useState(() => sessionStorage.getItem(STORAGE_KEY) === '1');
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0');
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const nextMessages: CopilotMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const result = await copilotChat(nextMessages);
      setMessages(m => [...m, { role: 'assistant', text: result.reply }]);
    } catch (e: any) {
      toast.error(e.message || 'Copilot failed to respond');
      setMessages(m => m.slice(0, -1)); // roll back the optimistic user message on failure
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle AI copilot"
        title="AI Copilot (Ctrl/Cmd+J)"
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-[var(--primary)] text-white shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center"
      >
        <Bot size={22} />
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-8rem)] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/40">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-[var(--primary)]" />
              <span className="text-sm font-semibold text-[var(--foreground)]">Copilot</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-sm text-[var(--muted-foreground)] px-1 py-2">
                Ask about your leads, business performance, or have me draft and send a follow-up.
                <div className="mt-2 space-y-1 text-xs">
                  <div>"Who are my hottest leads right now?"</div>
                  <div>"Draft a follow-up to lead X about pricing"</div>
                  <div>"How's this week looking?"</div>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-[var(--primary)] text-white rounded-br-sm' : 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm'}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="bg-[var(--muted)] text-[var(--muted-foreground)] rounded-xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2 w-fit">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="p-2 border-t border-[var(--border)] flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your copilot…"
              rows={1}
              className="flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="h-9 w-9 shrink-0 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
