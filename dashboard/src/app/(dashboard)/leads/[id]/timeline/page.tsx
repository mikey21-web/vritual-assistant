'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { UserPlus, MessageSquare, Send, TrendingUp, Tag, User, StickyNote, CheckSquare, Upload, CheckCircle, XCircle, ArrowLeftRight, AlertTriangle, RefreshCw, Circle, ArrowLeft } from 'lucide-react';

const iconMap: Record<string, { Icon: any; color: string }> = {
  lead_created: { Icon: UserPlus, color: 'text-blue-500' },
  message_received: { Icon: MessageSquare, color: 'text-green-500' },
  message_sent: { Icon: Send, color: 'text-blue-500' },
  score_changed: { Icon: TrendingUp, color: 'text-purple-500' },
  segment_changed: { Icon: Tag, color: 'text-orange-500' },
  assigned: { Icon: User, color: 'text-gray-500' },
  note_added: { Icon: StickyNote, color: 'text-yellow-500' },
  task_created: { Icon: CheckSquare, color: 'text-blue-500' },
  crm_push_attempted: { Icon: Upload, color: 'text-gray-500' },
  crm_push_succeeded: { Icon: CheckCircle, color: 'text-green-500' },
  crm_push_failed: { Icon: XCircle, color: 'text-red-500' },
  conversion_recorded: { Icon: ArrowLeftRight, color: 'text-green-500' },
  automation_failed: { Icon: AlertTriangle, color: 'text-red-500' },
  automation_retried: { Icon: RefreshCw, color: 'text-yellow-500' },
};

export default function LeadTimelinePage() {
  const params = useParams();
  const id = params.id as string;
  const [lead, setLead] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);

  useEffect(() => {
    api(`/leads/${id}`).then(setLead).catch(e => toast.error(e.message));
    api(`/leads/${id}/timeline`).then(setTimeline).catch(e => toast.error(e.message));
  }, [id]);

  const getIcon = (type: string) => {
    const entry = iconMap[type];
    if (!entry) return { Icon: Circle, color: 'text-gray-400' };
    return entry;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Leads
        </Link>
        {lead && (
          <span className="text-sm text-gray-400">
            Timeline for <span className="font-medium text-gray-700">{lead.contact?.name || 'Unknown'}</span>
            {lead.contact?.email && <span className="ml-1 text-xs">({lead.contact.email})</span>}
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-4">
        {timeline.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No timeline events yet</div>
        ) : (
          <div className="relative pl-8 border-l-2 border-gray-200 space-y-6">
            {timeline.map((item: any) => {
              const { Icon, color } = getIcon(item.type);
              return (
                <div key={item.id} className="relative">
                  <div className={`absolute -left-[41px] w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                    <div className="text-xs text-gray-400 mt-1">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
