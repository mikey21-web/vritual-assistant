import React, { useState, useEffect } from 'react';
import { fetchMessages } from '../lib/data';
import { api } from '../lib/api';
import { MessageSquare, Phone, Mail, Send, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const channelIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  SMS: Phone,
  TELEGRAM: Send,
};

interface Message {
  id: string;
  text?: string;
  body?: string;
  channel: string;
  direction: string;
  createdAt: string;
  leadId: string;
  lead?: { id: string; status: string; contact?: { id: string; name?: string; phone?: string } };
}

interface Conversation {
  leadId: string;
  contactName: string;
  contactPhone: string;
  channel: string;
  lastMessage: string;
  lastTime: string;
  messages: Message[];
}

function groupByConversation(messages: Message[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const leadId = m.leadId;
    if (!map.has(leadId)) {
      const contact = m.lead?.contact;
      map.set(leadId, {
        leadId,
        contactName: contact?.name || 'Unknown',
        contactPhone: contact?.phone || '',
        channel: m.channel,
        lastMessage: m.text || m.body || '',
        lastTime: m.createdAt,
        messages: [],
      });
    }
    const conv = map.get(leadId)!;
    conv.messages.push(m);
    if (new Date(m.createdAt) > new Date(conv.lastTime)) {
      conv.lastTime = m.createdAt;
      conv.lastMessage = m.text || m.body || '';
      conv.channel = m.channel;
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
}

export default function MessagesPage() {
  const [data, setData] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages().then((r: any) => setData(r.data || r)).catch(() => {});
  }, []);

  const conversations = groupByConversation(data);
  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.contactName.toLowerCase().includes(q)
      || c.lastMessage.toLowerCase().includes(q)
      || c.channel.toLowerCase().includes(q)
      || c.contactPhone.includes(q);
  });

  const selectedConv = conversations.find(c => c.leadId === selectedLeadId);
  const sortedMessages = selectedConv
    ? [...selectedConv.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const sendReply = async () => {
    if (!replyText.trim() || !selectedLeadId || sending) return;
    setSending(true);
    try {
      const msg = await api('/messages', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLeadId, text: replyText.trim(), channel: selectedConv?.channel || 'WHATSAPP' }),
      });
      setData(prev => [...prev, msg]);
      setReplyText('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send message');
    }
    setSending(false);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4 animate-fade-in">
      {/* Left Panel - Conversation List */}
      <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'} flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden`}>
        <div className="p-3 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Conversations</h2>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
              {search ? 'No conversations match your search' : 'No conversations yet'}
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = selectedLeadId === c.leadId;
              const Icon = channelIcons[c.channel] || MessageSquare;
              return (
                <button
                  key={c.leadId}
                  onClick={() => { setSelectedLeadId(c.leadId); setMobileView('chat'); }}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors ${
                    isSelected ? 'bg-[var(--muted)]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{c.contactName}</p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{c.lastMessage}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Icon size={12} className="text-[var(--muted-foreground)]" />
                      <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(c.lastTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  {c.messages.length > 1 && (
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{c.messages.length} messages</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Messages Thread */}
      <div className={`flex-1 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden ${
        mobileView === 'list' ? 'hidden lg:flex' : 'flex'
      }`}>
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto text-[var(--muted-foreground)] mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]">
              <button
                onClick={() => { setSelectedLeadId(null); setMobileView('list'); }}
                className="lg:hidden p-1 rounded hover:bg-[var(--border)] transition-colors"
              >
                <ChevronLeft size={18} className="text-[var(--foreground)]" />
              </button>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{selectedConv.contactName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedConv.contactPhone && `${selectedConv.contactPhone} · `}
                  {selectedConv.messages.length} messages
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sortedMessages.map(m => {
                const isInbound = m.direction === 'INBOUND';
                const Icon = channelIcons[m.channel] || MessageSquare;
                return (
                  <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] lg:max-w-[60%] rounded-xl px-4 py-2.5 ${
                      isInbound
                        ? 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm'
                        : 'bg-[var(--primary)] text-[var(--primary-foreground)] rounded-br-sm'
                    }`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={11} className={isInbound ? 'text-[var(--muted-foreground)]' : 'text-[var(--primary-foreground)]/70'} />
                        <span className={`text-[10px] font-medium ${isInbound ? 'text-[var(--muted-foreground)]' : 'text-[var(--primary-foreground)]/70'}`}>
                          {m.channel}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text || m.body || ''}</p>
                      <p className={`text-[10px] mt-1.5 ${isInbound ? 'text-[var(--muted-foreground)]' : 'text-[var(--primary-foreground)]/60'}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Reply input */}
            <div className="border-t border-[var(--border)] p-3 flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Type a reply..."
                disabled={sending}
                className="flex-1 h-10 rounded-lg border border-[var(--input)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 disabled:opacity-50"
              />
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
                className="h-10 w-10 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
