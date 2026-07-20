import { useState, useEffect } from 'react';
import { fetchLead, getLeadTimeline, fetchContacts, holdUnit, createBooking, fetchLeadBookings } from '../lib/data';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { startExplainFlow } from '../lib/explainMode';
import { ArrowLeft, Phone, MessageSquare, Calendar, FileText, X, AlertTriangle, Sparkles, Play, Send, Lock, ShoppingCart, MessageCircle } from 'lucide-react';
import CustomFieldsSection from '../components/CustomFieldsSection';
import LeadPaymentMilestones from '../components/LeadPaymentMilestones';
import PreVisitBrief from '../components/PreVisitBrief';
import ProjectPicker from '../components/ProjectPicker';
import UnitPicker from '../components/UnitPicker';
import type { Lead } from '../lib/types';

const statusStyles: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CONTACTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ENGAGED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  QUALIFYING: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  QUALIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CONVERTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  COLD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  SPAM: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const segmentStyles: Record<string, string> = {
  HOT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  WARM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COLD: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  UNQUALIFIED: 'bg-gray-100 text-gray-400 dark:bg-gray-800',
};

const SLA_DONE_STATUSES = new Set(['CONVERTED', 'LOST', 'SPAM']);

function SlaClock({ lead }: { lead: any }) {
  if (SLA_DONE_STATUSES.has(lead.status)) return null;
  const anchor = new Date(lead.status === 'NEW' ? lead.createdAt : lead.updatedAt || lead.createdAt);
  const minutes = Math.floor((Date.now() - anchor.getTime()) / 60000);
  const isHot = lead.segment === 'HOT';
  const thresholdMin = isHot ? 120 : 15;
  const overdueMin = thresholdMin * 4;
  let variant = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (minutes >= overdueMin) variant = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  else if (minutes >= thresholdMin) variant = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  const label = minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${Math.floor(minutes / 1440)}d`;
  const title = lead.status === 'NEW' ? `Untouched for ${label}` : `${label} since last update`;
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${variant}`}>
      <Calendar size={10} /> {label}
    </span>
  );
}

function NextBestAction({ lead }: { lead: Lead }) {
  if (SLA_DONE_STATUSES.has(lead.status)) return null;
  if (lead.status === 'NEW' && lead.contact?.phone) return { icon: Phone, text: 'Call or WhatsApp this lead — not yet contacted', action: 'call' };
  if (lead.segment === 'HOT' && lead.status !== 'CONTACTED') return { icon: Sparkles, text: 'Hot lead — follow up immediately', action: 'call' };
  if (!lead.assignedAgentId) return { icon: AlertTriangle, text: 'Unassigned — assign an agent', action: 'assign' };
  if (lead.status === 'ENGAGED' || lead.status === 'QUALIFYING') return { icon: Calendar, text: 'Schedule a site visit to move forward', action: 'visit' };
  return null;
}

function backToList() { window.location.hash = '#/leads'; }

export default function LeadWorkbenchPage() {
  const id = window.location.hash.replace('#', '').replace('/leads/', '');
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [briefLeadId, setBriefLeadId] = useState<string | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showCostSheetForm, setShowCostSheetForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState('');
  const [sendingWA, setSendingWA] = useState(false);
  const [duplicates, setDuplicates] = useState<number>(0);
  const [creatingVisit, setCreatingVisit] = useState(false);
  const [creatingCS, setCreatingCS] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [visitForm, setVisitForm] = useState({ projectId: '', projectName: '', startAt: '' });
  const [costSheetForm, setCostSheetForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '' });

  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdForm, setHoldForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '', holdHours: 24 });
  const [creatingHold, setCreatingHold] = useState(false);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '', title: '' });
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const l = await fetchLead(id);
        setLead(l);
        const t = await getLeadTimeline(id);
        setTimeline(t);
        if (l.contact?.phone) {
          try {
            const dupes = await fetchContacts(1, l.contact.phone);
            setDuplicates(dupes.data?.filter((c: any) => c.id !== l.contact?.id).length || 0);
          } catch {}
        }
        try {
          const bookings = await fetchLeadBookings(id);
          setExistingBookings(Array.isArray(bookings) ? bookings : bookings?.data || []);
        } catch {}
      } catch (e: any) {
        toast.error(e.message || 'Failed to load lead');
      }
      setLoading(false);
    })();
  }, [id]);

  const updateField = async (field: string, value: any) => {
    try {
      await api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ [field]: value }) });
      setLead(prev => prev ? { ...prev, [field]: value } as Lead : null);
      toast.success(`${field} updated`);
    } catch (err: any) {
      toast.error(err.message || `Failed to update ${field}`);
    }
  };

  const handleCall = async () => {
    setActionLoading('call');
    const tid = toast.loading('Initiating call...');
    try {
      const res = await api('/telephony/call', { method: 'POST', body: JSON.stringify({ leadId: id }) });
      toast.success(res.success ? 'Call initiated!' : (res.error || 'Call failed'), { id: tid });
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate call', { id: tid });
    }
    setActionLoading(null);
  };

  const handleSendWhatsApp = async () => {
    if (!whatsAppText.trim()) return;
    setSendingWA(true);
    try {
      await api('/conversations/messages', {
        method: 'POST',
        body: JSON.stringify({
          leadId: id,
          contactId: lead?.contact?.id,
          channel: 'WHATSAPP',
          direction: 'OUTBOUND',
          text: whatsAppText.trim(),
        }),
      });
      toast.success('WhatsApp message sent');
      setShowWhatsApp(false);
      setWhatsAppText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
    setSendingWA(false);
  };

  const handleCreateVisit = async () => {
    if (!visitForm.projectId || !visitForm.startAt) return toast.error('Project and date/time required');
    setCreatingVisit(true);
    try {
      await api('/site-visits', {
        method: 'POST',
        body: JSON.stringify({ leadId: id, projectId: visitForm.projectId, startAt: new Date(visitForm.startAt).toISOString() }),
      });
      toast.success('Site visit scheduled');
      setShowVisitForm(false);
      setVisitForm({ projectId: '', projectName: '', startAt: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule visit');
    }
    setCreatingVisit(false);
  };

  const handleCreateCostSheet = async () => {
    if (!costSheetForm.unitId || !costSheetForm.projectId) return toast.error('Unit and project required');
    setCreatingCS(true);
    try {
      await api('/cost-sheets', {
        method: 'POST',
        body: JSON.stringify({ leadId: id, unitId: costSheetForm.unitId, projectId: costSheetForm.projectId }),
      });
      toast.success('Cost sheet created');
      setShowCostSheetForm(false);
      setCostSheetForm({ projectId: '', projectName: '', unitId: '', unitLabel: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create cost sheet');
    }
    setCreatingCS(false);
  };

  const handleHoldUnit = async () => {
    if (!holdForm.unitId || !holdForm.projectId) return toast.error('Unit and project required');
    setCreatingHold(true);
    try {
      await holdUnit({ leadId: id, unitId: holdForm.unitId, holdHours: holdForm.holdHours });
      toast.success(`Unit held for ${holdForm.holdHours}h`);
      setShowHoldForm(false);
      setHoldForm({ projectId: '', projectName: '', unitId: '', unitLabel: '', holdHours: 24 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to hold unit');
    }
    setCreatingHold(false);
  };

  const handleProceedToBooking = async () => {
    if (!bookingForm.unitId || !bookingForm.projectId) return toast.error('Unit and project required');
    setCreatingBooking(true);
    try {
      await createBooking(id, {
        leadId: id,
        unitId: bookingForm.unitId,
        propertyId: bookingForm.projectId,
        title: bookingForm.title || `Booking for ${lead?.contact?.name || 'Lead'}`,
        startTime: new Date().toISOString(),
      });
      toast.success('Booking created');
      setShowBookingForm(false);
      setBookingForm({ projectId: '', projectName: '', unitId: '', unitLabel: '', title: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to create booking');
    }
    setCreatingBooking(false);
  };

  const handleMarkLost = async () => {
    if (!confirm('Mark this lead as LOST?')) return;
    setActionLoading('lost');
    await updateField('status', 'LOST');
    setActionLoading(null);
  };

  const nba = lead ? NextBestAction({ lead }) : null;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in p-6">
        <div className="h-5 w-32 bg-[var(--muted)] rounded animate-pulse" />
        <div className="h-8 w-64 bg-[var(--muted)] rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-[var(--muted)] rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)] p-6">
        <p>Lead not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={backToList} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted-foreground)]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-xl font-bold text-[var(--foreground)]">{lead.contact?.name || 'Unknown'}</h1>
          <SlaClock lead={lead} />
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[lead.status] || ''}`}>{lead.status}</span>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${segmentStyles[lead.segment] || ''}`}>{lead.segment}</span>
          {lead.score !== undefined && <span className="font-mono text-xs text-[var(--muted-foreground)]">Score: {lead.score}</span>}
        </div>
      </div>

      {duplicates > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-400">
          <AlertTriangle size={15} />
          <span>This contact has {duplicates} other lead{duplicates > 1 ? 's' : ''} — possible duplicate</span>
        </div>
      )}

      {nba && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400">
          <nba.icon size={15} />
          <span className="font-medium">Next: {nba.text}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {lead.contact?.phone && (
          <button onClick={handleCall} disabled={actionLoading === 'call'}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Phone size={14} /> {actionLoading === 'call' ? 'Calling...' : 'Call'}
          </button>
        )}
        {lead.contact?.phone && (
          <button onClick={() => setShowWhatsApp(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--accent)] transition-all">
            <MessageSquare size={14} /> WhatsApp
          </button>
        )}
        <button onClick={() => setShowVisitForm(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--accent)] transition-all">
          <Calendar size={14} /> Schedule Visit
        </button>
        <button onClick={() => setShowCostSheetForm(true)}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm font-medium hover:bg-[var(--accent)] transition-all">
          <FileText size={14} /> Cost Sheet
        </button>
        {!SLA_DONE_STATUSES.has(lead.status) && (
          <button onClick={() => setShowHoldForm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-all">
            <Lock size={14} /> Hold Unit
          </button>
        )}
        {!SLA_DONE_STATUSES.has(lead.status) && (
          <button onClick={() => {
            if (existingBookings.length > 0) {
              setBookingForm(f => ({ ...f, title: `Booking for ${lead.contact?.name || 'Lead'}` }));
            }
            setShowBookingForm(true);
          }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-all">
            <ShoppingCart size={14} /> Proceed to Booking
          </button>
        )}
        <button onClick={() => {
          const ordered = [...timeline].reverse();
          startExplainFlow(ordered.map((t: any) => ({
            page: 'leads', highlightId: id,
            narration: t.description ? `${t.title}: ${t.description}` : t.title,
          })));
        }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-all">
          <Play size={14} /> Play Timeline
        </button>
        {!SLA_DONE_STATUSES.has(lead.status) && (
          <button onClick={handleMarkLost} disabled={actionLoading === 'lost'}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-800/30 dark:text-red-400 dark:hover:bg-red-900/20 transition-all">
            <X size={14} /> {actionLoading === 'lost' ? '...' : 'Mark Lost'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Details</h4>
          <div className="space-y-2.5 text-sm">
            {lead.contact?.phone && <div className="flex items-center gap-2 text-[var(--muted-foreground)]"><Phone size={14} className="text-[var(--primary)]" /><span>{lead.contact.phone}</span></div>}
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]"><MessageSquare size={14} className="text-[var(--primary)]" /><span>{lead.contact?.email || '-'}</span></div>
            <div><span className="text-[var(--foreground)] font-medium">Source:</span> <span className="text-[var(--muted-foreground)]">{lead.source?.replace(/_/g, ' ')}</span></div>
            {lead.interest && <div><span className="text-[var(--foreground)] font-medium">Interest:</span> <span className="text-[var(--muted-foreground)]">{lead.interest}</span></div>}
            {lead.budget && <div><span className="text-[var(--foreground)] font-medium">Budget:</span> <span className="text-[var(--muted-foreground)]">{lead.budget}</span></div>}
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-medium">Deal Value:</span>
              <input type="number" defaultValue={lead.dealValue ?? ''} placeholder="Not set"
                onBlur={e => { const v = e.target.value.trim(); if (v) updateField('dealValue', Number(v)); }}
                className="w-28 h-7 rounded border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-medium">Status:</span>
              <select value={lead.status} onChange={e => updateField('status', e.target.value)}
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${statusStyles[lead.status] || ''}`}>
                {['NEW','CONTACTED','ENGAGED','QUALIFYING','QUALIFIED','CONVERTED','LOST','COLD','SPAM'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-medium">Segment:</span>
              <select value={lead.segment} onChange={e => updateField('segment', e.target.value)}
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${segmentStyles[lead.segment] || ''}`}>
                {['HOT','WARM','COLD','UNQUALIFIED'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {lead.assignedAgent && <div><span className="text-[var(--foreground)] font-medium">Agent:</span> <span className="text-[var(--muted-foreground)]">{lead.assignedAgent.name}</span></div>}
            {existingBookings.length > 0 && (
              <div><span className="text-[var(--foreground)] font-medium">Bookings:</span> <span className="text-[var(--muted-foreground)]">{existingBookings.length} existing</span></div>
            )}
            {lead.message && <div><span className="text-[var(--foreground)] font-medium">Message:</span> <span className="text-[var(--muted-foreground)]">{lead.message}</span></div>}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Timeline</h4>
            {timeline.length > 0 && (
              <button onClick={() => {
                const ordered = [...timeline].reverse();
                startExplainFlow(ordered.map((t: any) => ({
                  page: 'leads', highlightId: id,
                  narration: t.description ? `${t.title}: ${t.description}` : t.title,
                })));
              }} className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--primary)] hover:underline">
                <Play size={10} /> Play
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {timeline.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No activity yet</p>}
            {timeline.slice(0, 15).map((t: any) => (
              <div key={t.id} className="flex items-start gap-2.5 text-sm">
                {t.metadata?.recordingUrl ? <Phone size={14} className="text-green-500 mt-0.5 shrink-0" /> : <Calendar size={14} className="text-[var(--primary)] mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[var(--foreground)] truncate">{t.title}</p>
                    {t.type === 'delivery_updated' && (
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${t.description === 'delivered' || t.description === 'read' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : t.description === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {t.description}
                      </span>
                    )}
                    {t.metadata?.disposition && (
                      <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t.metadata.disposition.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[var(--muted-foreground)]">{new Date(t.createdAt).toLocaleString()}</p>
                    {t.metadata?.recordingUrl && (
                      <a href={t.metadata.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--primary)] hover:underline">Listen</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <CustomFieldsSection target="LEAD" targetId={lead.id} />
          </div>
          <LeadPaymentMilestones leadId={lead.id} />
          <button onClick={() => setBriefLeadId(lead.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity">
            <Sparkles size={12} /> Pre-Visit Brief
          </button>
          <a href={`#/create-event?leadId=${lead.id}&contactId=${lead.contact?.id || ''}`}
            className="block mt-2 text-xs font-medium text-[var(--primary)] hover:underline">
            <Calendar size={12} className="inline mr-1" />Create event from this lead
          </a>
        </div>
      </div>

      {briefLeadId && <PreVisitBrief leadId={briefLeadId} onClose={() => setBriefLeadId(null)} />}

      {showWhatsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowWhatsApp(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Send WhatsApp</h2>
              <button onClick={() => setShowWhatsApp(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">To: {lead.contact?.phone}</p>
            <textarea value={whatsAppText} onChange={e => setWhatsAppText(e.target.value)} rows={3} autoFocus
              placeholder="Type your message..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-none" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowWhatsApp(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
              <button onClick={handleSendWhatsApp} disabled={sendingWA || !whatsAppText.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                <Send size={13} /> {sendingWA ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVisitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowVisitForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Schedule Site Visit</h2>
              <button onClick={() => setShowVisitForm(false)}><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
              <ProjectPicker value={visitForm.projectId} onChange={(id, name) => setVisitForm(f => ({ ...f, projectId: id, projectName: name }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Date & Time</label>
              <input value={visitForm.startAt} onChange={e => setVisitForm(f => ({ ...f, startAt: e.target.value }))} type="datetime-local"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowVisitForm(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
              <button onClick={handleCreateVisit} disabled={creatingVisit}
                className="h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {creatingVisit ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCostSheetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCostSheetForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Create Cost Sheet</h2>
              <button onClick={() => setShowCostSheetForm(false)}><X size={18} /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
              <ProjectPicker value={costSheetForm.projectId} onChange={(id, name) => setCostSheetForm(f => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
              <UnitPicker value={costSheetForm.unitId} onChange={(id, label) => setCostSheetForm(f => ({ ...f, unitId: id, unitLabel: label }))} projectId={costSheetForm.projectId} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCostSheetForm(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
              <button onClick={handleCreateCostSheet} disabled={creatingCS}
                className="h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {creatingCS ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHoldForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowHoldForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Hold Unit</h2>
              <button onClick={() => setShowHoldForm(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Reserve a unit for {lead.contact?.name || 'this lead'} — blocks other sales</p>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
              <ProjectPicker value={holdForm.projectId} onChange={(id, name) => setHoldForm(f => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
              <UnitPicker value={holdForm.unitId} onChange={(id, label) => setHoldForm(f => ({ ...f, unitId: id, unitLabel: label }))} projectId={holdForm.projectId} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Hold Duration</label>
              <select value={holdForm.holdHours} onChange={e => setHoldForm(f => ({ ...f, holdHours: Number(e.target.value) }))}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm">
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={168}>7 days</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowHoldForm(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
              <button onClick={handleHoldUnit} disabled={creatingHold || !holdForm.unitId}
                className="h-9 px-5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {creatingHold ? 'Holding...' : 'Hold Unit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBookingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBookingForm(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Proceed to Booking</h2>
              <button onClick={() => setShowBookingForm(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">Create a booking for {lead.contact?.name || 'this lead'}</p>
            {existingBookings.length > 0 && (
              <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400">
                {existingBookings.length} existing booking{existingBookings.length > 1 ? 's' : ''} found for this lead
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Booking Title</label>
              <input value={bookingForm.title} onChange={e => setBookingForm(f => ({ ...f, title: e.target.value }))}
                placeholder={`Booking for ${lead.contact?.name || 'Lead'}`}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
              <ProjectPicker value={bookingForm.projectId} onChange={(id, name) => setBookingForm(f => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
              <UnitPicker value={bookingForm.unitId} onChange={(id, label) => setBookingForm(f => ({ ...f, unitId: id, unitLabel: label }))} projectId={bookingForm.projectId} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBookingForm(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm">Cancel</button>
              <button onClick={handleProceedToBooking} disabled={creatingBooking || !bookingForm.unitId}
                className="h-9 px-5 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {creatingBooking ? 'Creating...' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
