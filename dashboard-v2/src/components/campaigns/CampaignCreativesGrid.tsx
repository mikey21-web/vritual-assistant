import React from 'react';

interface Creative {
  id: string;
  name: string;
  type?: string;
  headline?: string;
  body?: string;
  cta?: string;
  imageUrl?: string;
  variant?: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

interface CampaignCreativesGridProps {
  creatives: Creative[];
  loading?: boolean;
  onEdit?: (creative: Creative) => void;
}

export default function CampaignCreativesGrid({ creatives, loading, onEdit }: CampaignCreativesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/2" />
            <div className="h-12 bg-[var(--muted)] rounded animate-pulse w-full" />
            <div className="h-3 bg-[var(--muted)] rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!creatives || creatives.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
        <div className="text-sm text-[var(--muted-foreground)]">No creatives yet</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creatives.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Image preview */}
          {c.imageUrl ? (
            <div className="h-32 bg-[var(--muted)] flex items-center justify-center overflow-hidden">
              <img
                src={c.imageUrl}
                alt={c.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="h-24 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)] flex items-center justify-center">
              <span className="text-2xl font-bold text-[var(--primary)]/30">{c.name?.charAt(0) || 'A'}</span>
            </div>
          )}

          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold text-[var(--foreground)] truncate">{c.name}</h4>
              {c.type && (
                <span className="shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--accent)] text-[var(--muted-foreground)]">
                  {c.type}
                </span>
              )}
            </div>

            {c.headline && (
              <p className="text-xs font-medium text-[var(--foreground)] line-clamp-1">{c.headline}</p>
            )}
            {c.body && (
              <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-2">{c.body}</p>
            )}

            {c.cta && (
              <div className="inline-flex px-3 py-1 rounded-md text-xs font-medium bg-[var(--primary)] text-white">
                {c.cta}
              </div>
            )}

            {c.variant && (
              <div className="text-[10px] text-[var(--muted-foreground)]">
                Variant: <span className="font-medium">{c.variant}</span>
              </div>
            )}

            {/* Performance stats */}
            {(c.impressions != null || c.clicks != null || c.conversions != null) && (
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
                {c.impressions != null && <span>{c.impressions.toLocaleString()} impressions</span>}
                {c.clicks != null && <span>{c.clicks} clicks</span>}
                {c.conversions != null && <span>{c.conversions} conv</span>}
              </div>
            )}

            {onEdit && (
              <button
                onClick={() => onEdit(c)}
                className="w-full mt-2 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
