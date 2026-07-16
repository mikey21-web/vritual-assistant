import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
}

function MetricCard({ title, value, subtitle, trend }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.08em]">
        {title}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-[var(--foreground)]">{value}</span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.direction === 'up'
                ? 'text-emerald-600'
                : trend.direction === 'down'
                ? 'text-rose-600'
                : 'text-[var(--muted-foreground)]'
            }`}
          >
            {trend.direction === 'up' && '▲'}
            {trend.direction === 'down' && '▼'}
            {trend.direction === 'neutral' && '•'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <div className="mt-1 text-xs text-[var(--muted-foreground)]">{subtitle}</div>}
    </div>
  );
}

interface CampaignPerformanceCardsProps {
  data: {
    totalLeads?: number;
    conversions?: number;
    conversionRate?: number;
    costPerLead?: number;
    totalSpend?: number;
    roi?: number;
    currency?: string;
  };
  loading?: boolean;
}

export default function CampaignPerformanceCards({ data, loading }: CampaignPerformanceCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-2/3" />
            <div className="h-6 bg-[var(--muted)] rounded animate-pulse w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const currency = data.currency || '₹';

  const metrics = [
    {
      title: 'Total Leads',
      value: (data.totalLeads || 0).toLocaleString(),
      subtitle: 'All time campaign leads',
    },
    {
      title: 'Conversions',
      value: (data.conversions || 0).toLocaleString(),
      subtitle: 'Converted leads',
    },
    {
      title: 'Conversion Rate',
      value: data.conversionRate != null ? `${data.conversionRate.toFixed(1)}%` : '—',
      subtitle: 'Overall rate',
    },
    {
      title: 'Cost / Lead',
      value: data.costPerLead != null ? `${currency}${data.costPerLead.toFixed(0)}` : '—',
      subtitle: 'Avg cost per lead',
    },
    {
      title: 'Total Spend',
      value: data.totalSpend != null ? `${currency}${(data.totalSpend / 1000).toFixed(1)}K` : '—',
      subtitle: 'Campaign spend',
    },
    {
      title: 'ROI',
      value: data.roi != null ? `${data.roi.toFixed(1)}x` : '—',
      subtitle: 'Return on investment',
      trend: data.roi != null ? {
        value: `${(data.roi * 100).toFixed(0)}%`,
        direction: data.roi >= 1 ? 'up' as const : 'down' as const,
      } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((m) => (
        <MetricCard key={m.title} {...m} />
      ))}
    </div>
  );
}
