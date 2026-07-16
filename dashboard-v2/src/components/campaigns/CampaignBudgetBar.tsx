import React from 'react';

interface CampaignBudgetBarProps {
  spent: number;
  total: number;
  currency?: string;
}

export default function CampaignBudgetBar({ spent, total, currency = '₹' }: CampaignBudgetBarProps) {
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--muted-foreground)]">Budget</span>
        <span className="font-medium text-[var(--foreground)]">
          {currency}{(spent || 0).toLocaleString()} / {currency}{(total || 0).toLocaleString()}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct > 90 ? 'var(--destructive)' : pct > 70 ? 'var(--primary)' : 'var(--primary-light)',
          }}
        />
      </div>
      <div className="text-[10px] text-[var(--muted-foreground)]">
        {pct.toFixed(0)}% spent
      </div>
    </div>
  );
}
