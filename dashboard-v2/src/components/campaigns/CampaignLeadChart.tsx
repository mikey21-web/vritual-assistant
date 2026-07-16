import React from 'react';

interface CampaignLeadChartProps {
  data: { date: string; count: number }[];
  loading?: boolean;
  height?: number;
  maxBars?: number;
}

export default function CampaignLeadChart({ data, loading, height = 200, maxBars = 30 }: CampaignLeadChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/4 mb-4" />
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-[var(--muted)] rounded-t animate-pulse"
              style={{ height: `${20 + Math.random() * 80}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Daily Leads (Last 30 Days)</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <span className="text-xs text-[var(--muted-foreground)]">No lead data available</span>
        </div>
      </div>
    );
  }

  // Take last maxBars entries
  const chartData = data.slice(-maxBars);
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  const barAreaHeight = height - 24;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Daily Leads (Last 30 Days)</h3>

      {/* Y-axis labels */}
      <div className="flex items-stretch gap-2" style={{ height: barAreaHeight }}>
        <div className="flex flex-col justify-between text-[10px] text-[var(--muted-foreground)] py-0.5 w-6 shrink-0 text-right">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount / 2)}</span>
          <span>0</span>
        </div>

        {/* CSS div-based bars */}
        <div className="flex-1 flex items-end gap-[3px]">
          {chartData.map((d) => {
            const barHeightPct = (d.count / maxCount) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col justify-end group relative"
                style={{ height: '100%' }}
              >
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${Math.max(barHeightPct, 2)}%`,
                    backgroundColor: 'var(--primary)',
                    opacity: 0.75,
                  }}
                  title={`${new Date(d.date).toLocaleDateString()}: ${d.count} leads`}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-[var(--foreground)] text-[var(--background)] text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow-lg">
                    {new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: {d.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date range */}
      {chartData.length > 1 && (
        <div className="flex justify-between mt-2 text-[10px] text-[var(--muted-foreground)]">
          <span>{new Date(chartData[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          <span>{new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        </div>
      )}
    </div>
  );
}
