import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";
import { Send, Bot, Loader2, AlertCircle, CheckCircle, Sparkles, MessageSquare, Trash2, Menu, X } from "lucide-react";

interface Action {
  tool: string; args: any; status: string; result?: string; requiresConfirmation?: boolean; pendingActionId?: string;
}

interface Message {
  id: string; role: string; content: string; toolCalls?: Action[]; createdAt: string;
}

interface Conversation {
  id: string; title: string; updatedAt: string; createdAt: string;
}

export default function CopilotPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    try {
      const res = await api("/copilot/conversations");
      setConvs(res || []);
    } catch { /* mock */ }
  };

  useEffect(() => { loadConvs(); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadMessages = async (id: string) => {
    setConvId(id);
    setLoading(true);
    setSidebarOpen(false);
    try {
      const res = await api(`/copilot/conversations/${id}`);
      setMessages(res.messages || []);
    } catch { setMessages([]); }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    setSending(true);

    const userMsg: Message = { id: `temp-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api("/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, conversationId: convId }),
      });

      if (res.conversationId && res.conversationId !== convId) {
        setConvId(res.conversationId);
        loadConvs();
      }

      const assistantMsg: Message = {
        id: `resp-${Date.now()}`, role: "assistant", content: res.reply,
        toolCalls: res.actions || [], createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    }
    setSending(false);
  };

  const confirmAction = async (action: Action) => {
    if (!action.pendingActionId) return;
    try {
      const res = await api("/copilot/confirm-action", {
        method: "POST",
        body: JSON.stringify({ pendingActionId: action.pendingActionId }),
      });
      toast.success(`Action confirmed: ${res?.result ? "done" : "processed"}`);
      // Refresh conversation to get updated state
      if (convId) {
        const conv = await api(`/copilot/conversations/${convId}`).catch(() => null);
        if (conv) setMessages(conv.messages || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm action");
    }
  };

  const newConversation = () => {
    setConvId(null);
    setMessages([]);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Conversation sidebar */}
      <div
        className={`${
          sidebarOpen ? "fixed inset-y-0 left-0 z-50 flex" : "hidden"
        } lg:flex w-64 shrink-0 rounded-r-xl lg:rounded-xl border border-[var(--border)] bg-[var(--card)] flex-col`}
      >
        <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
          <button onClick={newConversation} className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 transition-colors flex items-center justify-center gap-2">
            <Sparkles size={15} /> New Chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-md hover:bg-[var(--accent)] text-[var(--foreground)]">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convs.map(c => (
            <button key={c.id} onClick={() => loadMessages(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                convId === c.id ? "bg-[var(--primary-light)] text-[var(--primary)] font-semibold" : "text-[var(--foreground)]/70 hover:bg-[var(--accent)]"
              }`}>
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate">{c.title || "New conversation"}</span>
              </div>
              <span className="text-[10px] text-[var(--muted-foreground)] ml-6">{new Date(c.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
          {convs.length === 0 && <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No conversations yet</p>}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-md hover:bg-[var(--accent)] text-[var(--foreground)] -ml-1">
            <Menu size={18} />
          </button>
          <Bot size={18} className="text-[var(--primary)] shrink-0" />
          <span className="text-sm font-semibold text-[var(--foreground)]">CRM Copilot</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-[var(--muted-foreground)]">
              <Bot size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Ask the CRM Copilot anything</p>
              <p className="text-xs mt-1">e.g. "show me my hot leads" or "create a ticket for lead #5"</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id}>
                {m.role === "user" && (
                  <div className="flex justify-end mb-2">
                    <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-[var(--primary)] px-4 py-2.5 text-sm text-[var(--primary-foreground)]">
                      {m.content}
                    </div>
                  </div>
                )}
                {m.role === "assistant" && (
                  <div className="flex justify-start mb-2">
                    <div className="max-w-[70%] rounded-2xl rounded-bl-sm bg-[var(--muted)] px-4 py-2.5 text-sm text-[var(--foreground)]">
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-2 space-y-1 pt-2 border-t border-[var(--border)]">
                          {m.toolCalls.map((a, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {a.status === "error" ? <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" /> :
                               a.status === "pending" ? <AlertCircle size={12} className="text-amber-500 mt-0.5 shrink-0" /> :
                               <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-[var(--foreground)]">{a.tool}</span>
                                {a.result && <span className="text-[var(--muted-foreground)] ml-1">— {a.result}</span>}
                                {a.requiresConfirmation && (
                                  <div className="mt-1">
                                    <button onClick={() => confirmAction(a)}
                                      className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors">
                                      <CheckCircle size={10} /> Confirm
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-[var(--muted)] px-4 py-2.5 text-sm text-[var(--muted-foreground)]">
                <Loader2 size={14} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[var(--border)] p-4">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask the copilot to do something..."
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50" />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
