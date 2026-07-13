import React from 'react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  isHero?: boolean;
  sparklineData?: number[];
}

export function StatCard({
  id, title, value, change, changeDirection = 'neutral', timeframe = 'vs last week', isHero = false, sparklineData,
  loading = false,
}: StatCardProps & { loading?: boolean }) {
  if (loading) {
    return (
      <div id={id} className="relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)]">
        <div className="space-y-3">
          <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-1/3" />
          <div className="h-6 bg-[var(--muted)] rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }
  const generateSparklinePath = (data: number[]) => {
    if (!data || data.length < 2) return '';
    const width = 80, height = 24, padding = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  };

  const trendColor = changeDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400'
    : changeDirection === 'down' ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--muted-foreground)]';

  return (
    <div id={id || `stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-sm)] transition-all
        ${isHero ? 'md:col-span-2 lg:col-span-3 p-6' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.1em]">{title}</span>
        {sparklineData && sparklineData.length > 0 && (
          <div className="shrink-0 pt-0.5 ml-4">
            <svg width="80" height="24" className="overflow-visible">
              <path d={generateSparklinePath(sparklineData)} fill="none"
                stroke={changeDirection === 'up' ? 'var(--primary)' : changeDirection === 'down' ? 'var(--destructive)' : 'var(--muted-foreground-light)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-x-2">
        <span className={`font-display tracking-tight font-bold text-[var(--foreground)] ${isHero ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}`}>
          {value}
        </span>
        {change && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`font-medium ${trendColor}`}>
              {changeDirection === 'up' && '▲'} {changeDirection === 'down' && '▼'} {changeDirection === 'neutral' && '•'} {change}
            </span>
            <span className="text-[var(--muted-foreground)]">{timeframe}</span>
          </div>
        )}
      </div>
      {isHero && (
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--primary)]" />
            </span>
            Real-time feed streaming
          </span>
          <span className="font-mono text-[10px]">ENG v2.4</span>
        </div>
      )}
    </div>
  );
}
