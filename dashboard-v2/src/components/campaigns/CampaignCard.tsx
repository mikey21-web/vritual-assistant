import React, { useState, useRef, useEffect } from 'react';
import {
  Megaphone,
  Star,
  MoreVertical,
  Play,
  Pause,
  CheckCircle,
  Archive,
  Copy,
  ExternalLink,
  Users,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import CampaignBudgetBar from './CampaignBudgetBar';
import CampaignChannelIcons from './CampaignChannelIcons';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

interface CampaignCardProps {
  campaign: any;
  onAction: (action: string, campaign: any) => void;
  onClick?: (campaign: any) => void;
}

export default function CampaignCard({ campaign, onAction, onClick }: CampaignCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const status = campaign.status || (campaign.active ? 'active' : 'paused');
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const channels = campaign.channels || [];
  const leadCount = campaign.leadCount ?? campaign._count?.leads ?? 0;
  const conversionRate = campaign.conversionRate ?? 0;
  const spent = campaign.spent ?? 0;
  const totalBudget = campaign.totalBudget ?? 0;
  const costPerLead = campaign.costPerLead ?? (leadCount > 0 ? spent / leadCount : 0);

  const menuItems: { label: string; action: string; icon: React.ElementType; show?: boolean }[] = [
    { label: status === 'draft' ? 'Start' : status === 'active' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start', action: 'toggle', icon: status === 'active' ? Pause : Play, show: status !== 'completed' && status !== 'archived' },
    { label: 'Complete', action: 'complete', icon: CheckCircle, show: status === 'active' || status === 'paused' },
    { label: 'Archive', action: 'archive', icon: Archive, show: status !== 'archived' && status !== 'completed' },
    { label: 'Duplicate', action: 'duplicate', icon: Copy },
    { label: 'Open Detail', action: 'detail', icon: ExternalLink },
  ].filter((item) => item.show !== false);

  return (
    <div
      className="group relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 hover:shadow-md hover:border-[var(--primary)]/30 transition-all duration-200 cursor-pointer"
      onClick={() => onClick?.(campaign)}
    >
      {/* Priority star */}
      {campaign.priority === 'high' && (
        <div className="absolute top-3 right-3">
          <Star size={14} className="fill-amber-400 text-amber-400" />
        </div>
      )}

      {/* Top section */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)] flex items-center justify-center shrink-0">
          <Megaphone size={18} className="text-[var(--primary)]" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">{campaign.name}</h3>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
              {statusLabel}
            </span>
          </div>
          {campaign.description && (
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{campaign.description}</p>
          )}
        </div>
      </div>

      {/* Campaign type */}
      {campaign.campaignType && (
        <div className="mt-2 text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.06em] font-medium">
          {campaign.campaignType.replace(/-/g, ' ')}
        </div>
      )}

      {/* Channel icons */}
      {channels.length > 0 && (
        <div className="mt-3">
          <CampaignChannelIcons channels={channels} size={12} />
        </div>
      )}

      {/* Budget bar */}
      {totalBudget > 0 && (
        <div className="mt-3">
          <CampaignBudgetBar spent={spent} total={totalBudget} currency={campaign.currency || '₹'} />
        </div>
      )}

      {/* Lead count + conversion rate */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Users size={13} />
          <span className="font-medium text-[var(--foreground)]">{leadCount}</span>
          <span>leads</span>
        </div>
        {conversionRate > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <TrendingUp size={13} />
            <span className="font-medium text-[var(--foreground)]">{conversionRate}%</span>
            <span>conv.</span>
          </div>
        )}
        {costPerLead > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <DollarSign size={13} />
            <span className="font-medium text-[var(--foreground)]">{campaign.currency ? '' : '₹'}{Math.round(costPerLead).toLocaleString('en-IN')}</span>
            <span>/lead</span>
          </div>
        )}
        {campaign.startDate && (
          <div className="text-[10px] text-[var(--muted-foreground)] ml-auto">
            {new Date(campaign.startDate).toLocaleDateString()}
            {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString()}`}
          </div>
        )}
      </div>

      {/* 3-dot menu */}
      <div className="absolute top-3 right-10" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1 rounded-md hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1 animate-fade-in">
            {menuItems.map((item) => (
              <button
                key={item.action}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onAction(item.action, campaign);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              >
                <item.icon size={13} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
