import { useState, useMemo } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Eye, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface Submission {
  id: string;
  payload: Record<string, any>;
  formId: string;
  leadId?: string;
  source?: string;
  pageUrl?: string;
  utm?: Record<string, string>;
  completed: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  lead?: {
    id: string;
    status: string;
    source: string;
    contact: { name?: string; email?: string; phone?: string };
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

interface SubmissionsTableProps {
  submissions: Submission[];
  loading?: boolean;
  onView: (submission: Submission) => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

type SortField = "createdAt" | "source" | "completed" | "leadStatus";
type SortDir = "asc" | "desc";

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getContactName(sub: Submission): string {
  return sub.lead?.contact?.name || sub.lead?.contact?.email || sub.lead?.contact?.phone || "Unknown";
}

function getContactEmail(sub: Submission): string | undefined {
  return sub.lead?.contact?.email;
}

function getContactPhone(sub: Submission): string | undefined {
  return sub.lead?.contact?.phone;
}

function getLeadStatus(sub: Submission): string {
  return sub.lead?.status || "—";
}

const leadStatusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CONTACTED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  ENGAGED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  QUALIFYING: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  QUALIFIED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CONVERTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  COLD: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  SPAM: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

function getStatusBadgeClass(status: string): string {
  return leadStatusColors[status] || "bg-gray-100 text-gray-600 dark:bg-gray-800";
}

export default function SubmissionsTable({
  submissions,
  loading,
  onView,
  pagination,
  onPageChange,
}: SubmissionsTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    if (!submissions || submissions.length === 0) return [];
    return [...submissions].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "source":
          cmp = (a.source || "").localeCompare(b.source || "");
          break;
        case "completed":
          cmp = Number(a.completed) - Number(b.completed);
          break;
        case "leadStatus":
          cmp = getLeadStatus(a).localeCompare(getLeadStatus(b));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [submissions, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const renderSortableHeader = (label: string, field: SortField) => (
    <button
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
    >
      {label}
      <SortIcon field={field} />
    </button>
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                {["Created", "Contact", "Source", "Completed", "Lead Status", ""].map((h, i) => (
                  <th key={i} className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, r) => (
                <tr key={r} className="border-b border-[var(--border)]">
                  {Array.from({ length: 6 }).map((_, c) => (
                    <td key={c} className="py-3 px-4">
                      <Skeleton className="h-4 rounded w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center animate-fade-in">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--muted)] flex items-center justify-center mb-3">
          <Eye size={20} className="text-[var(--muted-foreground)]" />
        </div>
        <p className="text-sm font-medium text-[var(--foreground)]">No submissions yet</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Submissions will appear here once users start filling out this form.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {renderSortableHeader("Created", "createdAt")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Contact
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {renderSortableHeader("Source", "source")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {renderSortableHeader("Completed", "completed")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {renderSortableHeader("Lead Status", "leadStatus")}
              </th>
              <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((sub) => (
              <tr
                key={sub.id}
                onClick={() => onView(sub)}
                className="border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 cursor-pointer"
              >
                <td className="py-3 px-4 text-[var(--foreground)] whitespace-nowrap">
                  {formatDate(sub.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--foreground)]">
                      {getContactName(sub)}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {getContactEmail(sub) && <span>{getContactEmail(sub)}</span>}
                      {getContactEmail(sub) && getContactPhone(sub) && <span> · </span>}
                      {getContactPhone(sub) && <span>{getContactPhone(sub)}</span>}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-[var(--foreground)]">{sub.source || "—"}</span>
                </td>
                <td className="py-3 px-4">
                  {sub.completed ? (
                    <Badge variant="success" className="text-[10px]">Completed</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">Partial</Badge>
                  )}
                </td>
                <td className="py-3 px-4">
                  {sub.lead?.status ? (
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeClass(sub.lead.status)}`}>
                      {sub.lead.status}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(sub);
                    }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    <Eye size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--muted)]/50 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">
            Showing{" "}
            <span className="font-medium text-[var(--foreground)]">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-[var(--foreground)]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[var(--foreground)]">
              {pagination.total}
            </span>{" "}
            entries
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-1.5 border border-[var(--border)] rounded bg-[var(--card)] text-[var(--muted-foreground)] enabled:hover:bg-[var(--accent)] enabled:hover:text-[var(--foreground)] disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`min-w-[28px] h-7 rounded text-xs font-medium transition-all cursor-pointer ${
                      pagination.page === pageNum
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-1.5 border border-[var(--border)] rounded bg-[var(--card)] text-[var(--muted-foreground)] enabled:hover:bg-[var(--accent)] enabled:hover:text-[var(--foreground)] disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
