import React from 'react';
import {
  Play,
  Pause,
  CheckCircle,
  Archive,
  Copy,
  Edit,
  Plus,
  Target,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  detail?: string;
  timestamp: string;
  user?: string;
}

interface CampaignTimelineProps {
  entries: TimelineEntry[];
  loading?: boolean;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  started: Play,
  paused: Pause,
  completed: CheckCircle,
  archived: Archive,
  duplicated: Copy,
  edited: Edit,
  lead_added: Target,
  error: AlertCircle,
  default: Clock,
};

const EVENT_COLORS: Record<string, string> = {
  created: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  started: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  paused: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  completed: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  archived: 'text-slate-500 bg-slate-100 dark:bg-slate-900/30',
  duplicated: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  edited: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
  lead_added: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
  error: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  default: 'text-gray-500 bg-gray-100 dark:bg-gray-900/30',
};

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return ts;
  }
}

export default function CampaignTimeline({ entries, loading }: CampaignTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--muted)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-1/3" />
              <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="text-sm text-[var(--muted-foreground)]">No timeline events yet</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />

      <div className="space-y-6">
        {entries.map((entry) => {
          const Icon = EVENT_ICONS[entry.type] || EVENT_ICONS.default;
          const colorClass = EVENT_COLORS[entry.type] || EVENT_COLORS.default;

          return (
            <div key={entry.id} className="relative flex gap-4 pl-0">
              {/* Icon */}
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${colorClass}`}>
                <Icon size={14} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[var(--foreground)]">{entry.title}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                {entry.detail && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{entry.detail}</p>
                )}
                {entry.user && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">by {entry.user}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
