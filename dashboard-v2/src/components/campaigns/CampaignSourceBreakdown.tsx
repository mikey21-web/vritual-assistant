import React from 'react';

interface SourceItem {
  source: string;
  count: number;
  color?: string;
}

interface CampaignSourceBreakdownProps {
  data: SourceItem[];
  loading?: boolean;
  total?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  google: '#4285F4',
  email: '#EA4335',
  sms: '#34A853',
  whatsapp: '#25D366',
  'direct-mail': '#8B5CF6',
  organic: '#F59E0B',
  referral: '#6366F1',
  other: '#6B7280',
};

export default function CampaignSourceBreakdown({ data, loading, total }: CampaignSourceBreakdownProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
        <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-1/4" />
            <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Leads by Source</h3>
        <div className="text-xs text-[var(--muted-foreground)]">No source data available</div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const sum = total || data.reduce((a, d) => a + d.count, 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Leads by Source</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const pct = sum > 0 ? (item.count / sum) * 100 : 0;
          const barPct = sum > 0 ? (item.count / maxCount) * 100 : 0;
          const color = item.color || SOURCE_COLORS[item.source.toLowerCase()] || '#6B7280';
          return (
            <div key={item.source}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-[var(--foreground)] capitalize">{item.source.replace(/-/g, ' ')}</span>
                <span className="text-[var(--muted-foreground)]">
                  {item.count} ({pct.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
