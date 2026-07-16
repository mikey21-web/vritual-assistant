import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, X, List } from "lucide-react";
import { fetchForm, fetchSubmissions, fetchFormAnalytics } from "../lib/data";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import AnalyticsCards from "../components/forms/AnalyticsCards";
import SubmissionsTable from "../components/forms/SubmissionsTable";
import SubmissionDetail from "../components/forms/SubmissionDetail";
import type { Submission } from "../components/forms/SubmissionsTable";
import type { FormAnalytics } from "../components/forms/AnalyticsCards";

function getFormIdFromHash(): string | null {
  const match = window.location.hash.match(/\/forms\/([^/]+)\/submissions/);
  return match ? match[1] : null;
}

export default function FormSubmissionsPage() {
  // Route state
  const [formId, setFormId] = useState<string | null>(getFormIdFromHash);

  // Data state
  const [form, setForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });

  // Loading state
  const [loadingForm, setLoadingForm] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Filter state
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [completedFilter, setCompletedFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detail modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Track unique sources for filter dropdown
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Parse formId from URL on mount and hash changes
  useEffect(() => {
    const id = getFormIdFromHash();
    setFormId(id);

    const onHashChange = () => {
      const newId = getFormIdFromHash();
      if (newId !== id) {
        setFormId(newId);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Fetch form details
  useEffect(() => {
    if (!formId) {
      setLoadingForm(false);
      return;
    }

    setLoadingForm(true);
    fetchForm(formId)
      .then((data) => {
        setForm(data);
      })
      .catch((err) => {
        console.error("Failed to fetch form:", err);
        toast.error("Failed to load form details");
      })
      .finally(() => setLoadingForm(false));
  }, [formId]);

  // Fetch submissions
  const loadSubmissions = useCallback(
    async (page: number) => {
      if (!formId) return;

      setLoadingSubmissions(true);
      try {
        const params: Record<string, string> = {
          page: String(page),
          limit: "20",
        };

        if (search.trim()) params.search = search.trim();
        if (sourceFilter) params.source = sourceFilter;
        if (completedFilter !== "all") params.completed = completedFilter === "completed" ? "true" : "false";
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;

        const result = await fetchSubmissions(formId, params);
        setSubmissions(result.data || []);
        setPagination(result.meta || { total: 0, page, limit: 20 });

        // Collect unique sources
        if (result.data) {
          const sources = new Set<string>();
          result.data.forEach((s: Submission) => {
            if (s.source) sources.add(s.source);
          });
          setAvailableSources((prev) => {
            const combined = new Set([...prev, ...sources]);
            return Array.from(combined).sort();
          });
        }
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
        toast.error("Failed to load submissions");
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [formId, search, sourceFilter, completedFilter, dateFrom, dateTo]
  );

  // Fetch analytics
  useEffect(() => {
    if (!formId) {
      setLoadingAnalytics(false);
      return;
    }

    setLoadingAnalytics(true);
    fetchFormAnalytics(formId)
      .then((data) => {
        setAnalytics(data as FormAnalytics);
      })
      .catch((err) => {
        console.error("Failed to fetch analytics:", err);
        toast.error("Failed to load analytics");
      })
      .finally(() => setLoadingAnalytics(false));
  }, [formId]);

  // Reload submissions when filters change
  useEffect(() => {
    if (formId) {
      loadSubmissions(1);
    }
  }, [formId, search, sourceFilter, completedFilter, dateFrom, dateTo, loadSubmissions]);

  const handlePageChange = (page: number) => {
    loadSubmissions(page);
  };

  const handleBack = () => {
    window.location.hash = "/forms";
  };

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("");
    setCompletedFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = search || sourceFilter || completedFilter !== "all" || dateFrom || dateTo;

  // Loading state for the whole page
  if (!formId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--muted-foreground)] animate-fade-in">
        <List size={40} className="mb-3 opacity-40" />
        <p className="text-sm">Form ID not found in URL</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleBack}>
          <ArrowLeft size={14} className="mr-1" /> Back to Forms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0"
            aria-label="Back to forms"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">
                {loadingForm ? (
                  <span className="inline-block w-32 h-6 rounded bg-[var(--muted)] animate-pulse" />
                ) : (
                  form?.name || "Unknown Form"
                )}
              </h1>
              {!loadingSubmissions && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                  {pagination.total} total
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Submissions</p>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <AnalyticsCards data={analytics} loading={loadingAnalytics} />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search contact name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Source Filter */}
            <div className="w-[150px]">
              <Select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="h-9 text-sm"
              >
                <option value="">All Sources</option>
                {availableSources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>

            {/* Completed Filter */}
            <div className="w-[140px]">
              <Select
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value)}
                className="h-9 text-sm"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="partial">Partial</option>
              </Select>
            </div>

            {/* Date Range */}
            <div className="w-[140px]">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="h-9 text-sm"
              />
            </div>
            <div className="w-[140px]">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="h-9 text-sm"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs gap-1 text-[var(--muted-foreground)]"
              >
                <X size={13} />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <SubmissionsTable
        submissions={submissions}
        loading={loadingSubmissions}
        onView={setSelectedSubmission}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

      {/* Submission Detail Drawer */}
      <SubmissionDetail
        submission={selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      />
    </div>
  );
}
