import React from 'react';

interface TargetingData {
  propertyTypes?: string[];
  budgetMin?: number;
  budgetMax?: number;
  locations?: string[];
  buyerType?: string;
}

interface CampaignTargetingPanelProps {
  data: TargetingData;
  loading?: boolean;
  editable?: boolean;
  onEdit?: () => void;
}

export default function CampaignTargetingPanel({ data, loading, editable, onEdit }: CampaignTargetingPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
        <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/3" />
        <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-2/3" />
        <div className="h-4 bg-[var(--muted)] rounded animate-pulse w-1/2" />
      </div>
    );
  }

  const hasData = data && (data.propertyTypes?.length || data.locations?.length || data.buyerType || data.budgetMin != null);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Audience & Targeting</h3>
        {editable && (
          <button
            onClick={onEdit}
            className="text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Edit
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="text-xs text-[var(--muted-foreground)]">No targeting configuration</div>
      ) : (
        <div className="space-y-4">
          {/* Property Types */}
          {data.propertyTypes && data.propertyTypes.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-1.5">
                Property Types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.propertyTypes.map((pt) => (
                  <span
                    key={pt}
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]"
                  >
                    {pt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Budget Range */}
          {(data.budgetMin != null || data.budgetMax != null) && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-1.5">
                Budget Range
              </div>
              <span className="text-sm text-[var(--foreground)]">
                ₹{(data.budgetMin || 0).toLocaleString()} – ₹{(data.budgetMax || 0).toLocaleString()}
              </span>
            </div>
          )}

          {/* Locations */}
          {data.locations && data.locations.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-1.5">
                Locations
              </div>
              <div className="flex flex-wrap gap-1.5">
                {data.locations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--foreground)]"
                  >
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Buyer Type */}
          {data.buyerType && (
            <div>
              <div className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[0.06em] mb-1.5">
                Buyer Type
              </div>
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                {data.buyerType}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
