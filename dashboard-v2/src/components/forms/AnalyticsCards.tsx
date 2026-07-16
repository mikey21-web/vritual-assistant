import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { TrendingUp, BarChart3, List, CheckCircle, Target, Users } from "lucide-react";

export interface FormAnalytics {
  totalSubmissions: number;
  completionRate: number;
  sourceBreakdown: Array<{ source: string; count: number }>;
  fieldDropOff: Array<{ stepId: string; label: string; reached: number; completed: number }>;
  trends: Array<{ date: string; count: number }>;
}

interface AnalyticsCardsProps {
  data: FormAnalytics | null;
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass = "text-[var(--primary)]",
}: {
  title: string;
  value: string;
  subtitle?: React.ReactNode;
  icon: React.ElementType;
  colorClass?: string;
}) {
  return (
    <Card className="animate-fade-in">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            {subtitle && (
              <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg p-2.5 bg-[var(--muted)] ${colorClass}`}>
            <Icon size={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function getTodayCount(trends: Array<{ date: string; count: number }>): number {
  if (!trends || trends.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const found = trends.find((t) => t.date.slice(0, 10) === today);
  return found?.count ?? 0;
}

export default function AnalyticsCards({ data, loading }: AnalyticsCardsProps) {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-24 rounded" />
              <div className="flex gap-1 h-20 items-end">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${20 + Math.random() * 60}px` }} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const topSource = data.sourceBreakdown && data.sourceBreakdown.length > 0
    ? data.sourceBreakdown.reduce((max, s) => (s.count > max.count ? s : max), data.sourceBreakdown[0])
    : null;

  const maxSourceCount = data.sourceBreakdown
    ? Math.max(...data.sourceBreakdown.map((s) => s.count), 1)
    : 1;

  const maxTrendCount = data.trends
    ? Math.max(...data.trends.map((t) => t.count), 1)
    : 1;

  const todayCount = getTodayCount(data.trends);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Submissions"
          value={data.totalSubmissions.toLocaleString()}
          icon={List}
        />
        <MetricCard
          title="Completion Rate"
          value={`${Math.round(data.completionRate * 100)}%`}
          subtitle={
            <span className="flex items-center gap-1.5 mt-1">
              <span className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden inline-block w-16">
                <span
                  className="block h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.round(data.completionRate * 100)}%` }}
                />
              </span>
            </span>
          }
          icon={CheckCircle}
          colorClass="text-emerald-600"
        />
        <MetricCard
          title="Top Source"
          value={topSource?.source ?? "N/A"}
          subtitle={topSource ? `${topSource.count} submissions` : undefined}
          icon={Target}
          colorClass="text-indigo-600"
        />
        <MetricCard
          title="Today"
          value={todayCount.toLocaleString()}
          subtitle="submissions today"
          icon={TrendingUp}
          colorClass="text-amber-600"
        />
      </div>

      {/* Source Breakdown + Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Source Breakdown */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={15} className="text-[var(--muted-foreground)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Source Breakdown</h3>
            </div>
            {(!data.sourceBreakdown || data.sourceBreakdown.length === 0) ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No source data</p>
            ) : (
              <div className="space-y-3">
                {data.sourceBreakdown.map((source) => {
                  const pct = (source.count / maxSourceCount) * 100;
                  return (
                    <div key={source.source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[var(--foreground)] font-medium truncate">{source.source}</span>
                        <span className="text-[var(--muted-foreground)] font-mono text-xs">{source.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                          style={{ width: `${Math.max(pct, source.count > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-[var(--muted-foreground)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Daily Submissions (30 days)</h3>
            </div>
            {(!data.trends || data.trends.length === 0) ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No trend data</p>
            ) : (
              <div className="relative">
                {/* Y-axis labels */}
                <div className="absolute -top-1 left-0 right-0 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                  <span>{maxTrendCount}</span>
                  <span>{Math.round(maxTrendCount / 2)}</span>
                  <span>0</span>
                </div>
                <div className="flex items-end gap-[2px] h-24 mt-4 mb-1">
                  {data.trends.map((day, i) => {
                    const height = (day.count / maxTrendCount) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end group relative min-w-[4px]"
                      >
                        <div
                          className="w-full rounded-t transition-all duration-200 hover:opacity-80"
                          style={{
                            height: `${Math.max(height, day.count > 0 ? 8 : 0)}%`,
                            backgroundColor: day.count > 0 ? "var(--primary)" : "var(--muted)",
                            opacity: day.count > 0 ? 0.8 : 0.3,
                          }}
                          title={`${day.date.slice(0, 10)}: ${day.count}`}
                        />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                          <div className="bg-[var(--foreground)] text-[var(--background)] text-[10px] px-2 py-1 rounded shadow whitespace-nowrap">
                            {day.date.slice(0, 10)}: {day.count}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Field Drop-Off */}
      {data.fieldDropOff && data.fieldDropOff.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={15} className="text-[var(--muted-foreground)]" />
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Field Drop-Off</h3>
            </div>
            <div className="space-y-3">
              {data.fieldDropOff.map((step) => {
                const completedPct = step.reached > 0 ? (step.completed / step.reached) * 100 : 0;
                const droppedPct = step.reached > 0 ? ((step.reached - step.completed) / step.reached) * 100 : 0;
                return (
                  <div key={step.stepId}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[var(--foreground)] font-medium">{step.label}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {step.completed} / {step.reached}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-[var(--muted)] overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 rounded-l-full"
                        style={{ width: `${completedPct}%` }}
                      />
                      {droppedPct > 0 && (
                        <div
                          className="h-full bg-red-400 transition-all duration-500"
                          style={{ width: `${droppedPct}%` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      <span className="text-emerald-600">{step.completed} completed</span>
                      {step.reached - step.completed > 0 && (
                        <span className="text-red-500">{step.reached - step.completed} dropped</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
