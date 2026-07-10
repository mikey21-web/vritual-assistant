import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import { Send, Bot, Loader2, X, Sparkles, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface Message {
  id: string; role: string; content: string; createdAt: string;
}

export default function MikeyWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    setSending(true);
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() }]);

    try {
      const res = await api("/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, conversationId: convId }),
      });
      if (res.conversationId && res.conversationId !== convId) setConvId(res.conversationId);
      setMessages(prev => [...prev, { id: `m-${Date.now()}`, role: "assistant", content: res.reply, createdAt: new Date().toISOString() }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: `Error: ${e.message}`, createdAt: new Date().toISOString() }]);
    }
    setSending(false);
  };

  const toggle = () => {
    setOpen(!open);
    if (!hasOpened) {
      setHasOpened(true);
      setMessages([{ id: "welcome", role: "assistant", content: "Hey! I'm Mikey — your AI CRM assistant. Ask me anything about your leads, tasks, or campaigns!", createdAt: new Date().toISOString() }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[380px] h-[520px] rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col overflow-hidden animate-scale-in origin-bottom-right">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--primary)] text-white">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center"><Bot size={14} /></div>
              <span className="text-sm font-semibold">Mikey</span>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/20 transition-colors"><X size={15} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[var(--primary)] text-white rounded-br-md"
                    : "bg-[var(--muted)] text-[var(--foreground)] rounded-bl-md"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-[var(--muted)] rounded-xl rounded-bl-md px-3.5 py-2.5 text-sm text-[var(--muted-foreground)] flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" /> Mikey is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask Mikey anything..."
                className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              />
              <button onClick={send} disabled={sending || !input.trim()}
                className="h-9 w-9 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={toggle}
        className={`h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          open ? "bg-[var(--muted-foreground)] rotate-45" : "bg-[var(--primary)] hover:scale-105"
        } text-white`}>
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>
    </div>
  );
}
