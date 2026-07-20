import { useState, useEffect } from 'react';
import { fetchLead, getLeadTimeline, fetchContacts, holdUnit, createBooking, fetchLeadBookings, fetchLeadCostSheets, draftAIReply } from '../lib/data';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { startExplainFlow } from '../lib/explainMode';
import { ArrowLeft, Phone, MessageSquare, Calendar, FileText, X, AlertTriangle, Sparkles, Play, Send, Lock, ShoppingCart, MessageCircle, UserPlus, TrendingUp, Tag, UserCheck, CheckCircle, Database, Star, Bot, DollarSign, Clock, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
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

const timelineIcon: Record<string, { icon: any; color: string; bg: string }> = {
  lead_created: { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  message_received: { icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  message_sent: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  score_changed: { icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  segment_changed: { icon: Tag, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  assigned: { icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  site_visit_scheduled: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  site_visit_confirmed: { icon: Calendar, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  site_visit_completed: { icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  site_visit_checked_in: { icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  site_visit_no_show: { icon: Calendar, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  site_visit_rescheduled: { icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  site_visit_cancelled: { icon: Calendar, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  cost_sheet_created: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  cost_sheet_submitted: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  cost_sheet_approved: { icon: FileText, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  cost_sheet_sent: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  unit_hold_created: { icon: Lock, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  unit_hold_released: { icon: Lock, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  unit_hold_expired: { icon: Clock, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  booking_draft_created: { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  booking_confirmed: { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  booking_cancelled: { icon: ShoppingCart, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  delivery_updated: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  crm_push_succeeded: { icon: Database, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  crm_push_failed: { icon: Database, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  conversion: { icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  agent_run_completed: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  automation_failed: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  event_invited: { icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  event_rsvp: { icon: Calendar, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  payment_confirmed: { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  payment_reversed: { icon: DollarSign, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

function getTimelineConfig(type: string) {
  return timelineIcon[type] || { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' };
}

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

function backToList() { window.location.hash = '#/queue'; }

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
  const [draftingReply, setDraftingReply] = useState(false);

  const [visitForm, setVisitForm] = useState({ projectId: '', projectName: '', startAt: '' });
  const [costSheetForm, setCostSheetForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '' });

  const [showHoldForm, setShowHoldForm] = useState(false);
  const [holdForm, setHoldForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '', holdHours: 24 });
  const [creatingHold, setCreatingHold] = useState(false);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({ projectId: '', projectName: '', unitId: '', unitLabel: '', title: '' });
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [approvedCostSheets, setApprovedCostSheets] = useState<any[]>([]);
  const [showApprovedCS, setShowApprovedCS] = useState(false);

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
        try {
          const csRes = await fetchLeadCostSheets(id);
          const sheets = csRes?.data || [];
          setApprovedCostSheets(sheets.filter((s: any) => s.status === 'APPROVED'));
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

  const handleDraftReply = async () => {
    setDraftingReply(true);
    try {
      const res = await draftAIReply(id);
      setWhatsAppText(res.draft);
      toast.success('Draft generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    }
    setDraftingReply(false);
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
      const t = await getLeadTimeline(id);
      setTimeline(t);
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
      const t = await getLeadTimeline(id);
      setTimeline(t);
      const csRes = await fetchLeadCostSheets(id);
      setApprovedCostSheets((csRes?.data || []).filter((s: any) => s.status === 'APPROVED'));
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
      const t = await getLeadTimeline(id);
      setTimeline(t);
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
      const t = await getLeadTimeline(id);
      setTimeline(t);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create booking');
    }
    setCreatingBooking(false);
  };

  const handleQuickBookFromApproved = async (cs: any) => {
    setCreatingBooking(true);
    try {
      await createBooking(id, {
        leadId: id,
        unitId: cs.unitId,
        propertyId: cs.projectId,
        costSheetId: cs.id,
        title: `Booking from approved cost sheet — Unit ${cs.unit?.unitNumber || ''}`,
        startTime: new Date().toISOString(),
      });
      toast.success('Booking created from approved cost sheet');
      setShowApprovedCS(false);
      const t = await getLeadTimeline(id);
      setTimeline(t);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={backToList} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted-foreground)]">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--foreground)] truncate">{lead.contact?.name || 'Unknown'}</h1>
          <SlaClock lead={lead} />
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyles[lead.status] || ''}`}>{lead.status}</span>
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${segmentStyles[lead.segment] || ''}`}>{lead.segment}</span>
          {lead.score !== undefined && <span className="font-mono text-xs text-[var(--muted-foreground)] shrink-0 hidden sm:inline">Score: {lead.score}</span>}
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

      {/* Approved Cost Sheet Quick Action */}
      {approvedCostSheets.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-green-50 border border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700/30 dark:text-green-400">
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span className="text-sm font-medium">{approvedCostSheets.length} approved cost sheet{approvedCostSheets.length > 1 ? 's' : ''} ready</span>
          </div>
          <button onClick={() => setShowApprovedCS(true)}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
            <ShoppingCart size={13} /> Book Now
          </button>
        </div>
      )}

      {/* Actions - mobile responsive */}
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
          <Calendar size={14} /> Visit
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
          <button onClick={() => { setShowBookingForm(true); }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-green-300 bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-all">
            <ShoppingCart size={14} /> Book
          </button>
        )}
        <button onClick={() => {
          const ordered = [...timeline].reverse();
          startExplainFlow(ordered.map((t: any) => ({
            page: 'leads', highlightId: id,
            narration: t.description ? `${t.title}: ${t.description}` : t.title,
          })));
        }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-all">
          <Play size={14} /> Timeline
        </button>
        {!SLA_DONE_STATUSES.has(lead.status) && (
          <button onClick={handleMarkLost} disabled={actionLoading === 'lost'}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-800/30 dark:text-red-400 dark:hover:bg-red-900/20 transition-all">
            <X size={14} /> {actionLoading === 'lost' ? '...' : 'Lost'}
          </button>
        )}
      </div>

      {/* Desktop: 3-column layout / Mobile: single column */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Details Column */}
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

        {/* Timeline Column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Unified Timeline</h4>
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
          <div className="space-y-1 max-h-[28rem] overflow-y-auto pr-1">
            {timeline.length === 0 && <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">No activity yet</p>}
            {timeline.slice(0, 30).map((t: any) => {
              const cfg = getTimelineConfig(t.type);
              const Icon = cfg.icon;
              return (
                <div key={t.id} className="flex items-start gap-2.5 py-2 text-sm group hover:bg-[var(--accent)]/30 rounded-lg px-2 -mx-2 transition-colors">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${cfg.bg} shrink-0 mt-0.5`}>
                    <Icon size={13} className={cfg.color} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--foreground)] truncate text-sm font-medium">{t.title}</p>
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
              );
            })}
          </div>
        </div>

        {/* Custom Fields & Tools Column */}
        <div className="space-y-6">
          <div>
            <CustomFieldsSection target="LEAD" targetId={lead.id} />
          </div>
          <LeadPaymentMilestones leadId={lead.id} />
          <button onClick={() => setBriefLeadId(lead.id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity w-full sm:w-auto justify-center">
            <Sparkles size={12} /> Pre-Visit Brief
          </button>
          <a href={`#/create-event?leadId=${lead.id}&contactId=${lead.contact?.id || ''}`}
            className="block mt-2 text-xs font-medium text-[var(--primary)] hover:underline text-center sm:text-left">
            <Calendar size={12} className="inline mr-1" />Create event from this lead
          </a>
        </div>
      </div>

      {briefLeadId && <PreVisitBrief leadId={briefLeadId} onClose={() => setBriefLeadId(null)} />}

      {/* WhatsApp Composer with Jarvis Draft */}
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
            <div className="flex justify-between gap-2">
              <button onClick={handleDraftReply} disabled={draftingReply}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 disabled:opacity-50 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-all">
                <Sparkles size={13} /> {draftingReply ? 'Drafting...' : 'Draft with Jarvis'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowWhatsApp(false)} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
                <button onClick={handleSendWhatsApp} disabled={sendingWA || !whatsAppText.trim()}
                  className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  <Send size={13} /> {sendingWA ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Visit */}
      {showVisitForm && <VisitFormModal lead={lead} visitForm={visitForm} setVisitForm={setVisitForm} onClose={() => setShowVisitForm(false)} onSubmit={handleCreateVisit} creating={creatingVisit} />}

      {/* Cost Sheet Form */}
      {showCostSheetForm && <CostSheetFormModal lead={lead} form={costSheetForm} setForm={setCostSheetForm} onClose={() => setShowCostSheetForm(false)} onSubmit={handleCreateCostSheet} creating={creatingCS} />}

      {/* Hold Unit */}
      {showHoldForm && <HoldUnitModal lead={lead} form={holdForm} setForm={setHoldForm} onClose={() => setShowHoldForm(false)} onSubmit={handleHoldUnit} creating={creatingHold} />}

      {/* Proceed to Booking */}
      {showBookingForm && <BookingFormModal lead={lead} form={bookingForm} setForm={setBookingForm} onClose={() => setShowBookingForm(false)} onSubmit={handleProceedToBooking} creating={creatingBooking} existingBookings={existingBookings} />}

      {/* Quick Book from Approved Cost Sheet */}
      {showApprovedCS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowApprovedCS(false)}>
          <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Quick Book from Approved Cost Sheet</h2>
              <button onClick={() => setShowApprovedCS(false)}><X size={18} /></button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">These cost sheets are approved and ready for booking.</p>
            <div className="space-y-2">
              {approvedCostSheets.map((cs: any) => (
                <div key={cs.id} className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800/30 dark:bg-green-900/10">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{cs.project?.name || 'Project'} — {cs.unit?.unitNumber || 'Unit'}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Approved · {cs.totalPaise ? `₹${(Number(cs.totalPaise) / 100).toLocaleString()}` : ''}</p>
                  </div>
                  <button onClick={() => handleQuickBookFromApproved(cs)} disabled={creatingBooking}
                    className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {creatingBooking ? 'Booking...' : 'Book Now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============= Modal Sub-components ============= */

function VisitFormModal({ lead, visitForm, setVisitForm, onClose, onSubmit, creating }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Schedule Site Visit</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
          <ProjectPicker value={visitForm.projectId} onChange={(id: string, name: string) => setVisitForm((f: any) => ({ ...f, projectId: id, projectName: name }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Date & Time</label>
          <input value={visitForm.startAt} onChange={e => setVisitForm((f: any) => ({ ...f, startAt: e.target.value }))} type="datetime-local"
            className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          <button onClick={onSubmit} disabled={creating}
            className="h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {creating ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CostSheetFormModal({ lead, form, setForm, onClose, onSubmit, creating }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Create Cost Sheet</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
          <ProjectPicker value={form.projectId} onChange={(id: string, name: string) => setForm((f: any) => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
          <UnitPicker value={form.unitId} onChange={(id: string, label: string) => setForm((f: any) => ({ ...f, unitId: id, unitLabel: label }))} projectId={form.projectId} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          <button onClick={onSubmit} disabled={creating}
            className="h-9 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldUnitModal({ lead, form, setForm, onClose, onSubmit, creating }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Hold Unit</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">Reserve a unit for {lead?.contact?.name || 'this lead'} — blocks other sales</p>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
          <ProjectPicker value={form.projectId} onChange={(id: string, name: string) => setForm((f: any) => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
          <UnitPicker value={form.unitId} onChange={(id: string, label: string) => setForm((f: any) => ({ ...f, unitId: id, unitLabel: label }))} projectId={form.projectId} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Hold Duration</label>
          <select value={form.holdHours} onChange={e => setForm((f: any) => ({ ...f, holdHours: Number(e.target.value) }))}
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
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          <button onClick={onSubmit} disabled={creating || !form.unitId}
            className="h-9 px-5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {creating ? 'Holding...' : 'Hold Unit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingFormModal({ lead, form, setForm, onClose, onSubmit, creating, existingBookings }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Proceed to Booking</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">Create a booking for {lead?.contact?.name || 'this lead'}</p>
        {existingBookings.length > 0 && (
          <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400">
            {existingBookings.length} existing booking{existingBookings.length > 1 ? 's' : ''} found for this lead
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Booking Title</label>
          <input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
            placeholder={`Booking for ${lead?.contact?.name || 'Lead'}`}
            className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Project</label>
          <ProjectPicker value={form.projectId} onChange={(id: string, name: string) => setForm((f: any) => ({ ...f, projectId: id, projectName: name, unitId: '', unitLabel: '' }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1 block">Unit</label>
          <UnitPicker value={form.unitId} onChange={(id: string, label: string) => setForm((f: any) => ({ ...f, unitId: id, unitLabel: label }))} projectId={form.projectId} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)]">Cancel</button>
          <button onClick={onSubmit} disabled={creating || !form.unitId}
            className="h-9 px-5 rounded-lg bg-green-600 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
