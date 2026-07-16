import { Drawer } from "../ui/drawer";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ExternalLink, Calendar, Globe, Tag } from "lucide-react";
import type { Submission } from "./SubmissionsTable";

interface SubmissionDetailProps {
  submission: Submission | null;
  onClose: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border)]/50 last:border-0">
      <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider shrink-0 min-w-[100px]">
        {label}
      </span>
      <span className="text-sm text-[var(--foreground)] text-right break-all">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)] pt-2 pb-1">
      <Icon size={14} className="text-[var(--muted-foreground)]" />
      {title}
    </h4>
  );
}

export default function SubmissionDetail({ submission, onClose }: SubmissionDetailProps) {
  if (!submission) return null;

  const utmTags = submission.utm
    ? Object.entries(submission.utm).filter(([, v]) => v)
    : [];

  const formFields = submission.payload
    ? Object.entries(submission.payload).filter(([, v]) => v !== null && v !== undefined && v !== "")
    : [];

  return (
    <Drawer
      open={!!submission}
      onClose={onClose}
      title="Submission Detail"
      description={`ID: ${submission.id.slice(0, 8)}...`}
      width="max-w-lg"
    >
      {/* Status Badge */}
      <div className="flex items-center gap-2 mb-2">
        {submission.completed ? (
          <Badge variant="success" className="text-[11px]">Completed</Badge>
        ) : (
          <Badge variant="warning" className="text-[11px]">Partial</Badge>
        )}
        <span className="text-xs text-[var(--muted-foreground)]">
          Created {formatDate(submission.createdAt)}
        </span>
      </div>

      {/* Source & UTM */}
      {submission.source && (
        <>
          <SectionTitle icon={Globe} title="Source" />
          <div className="space-y-1 mb-3">
            <DetailRow label="Source" value={submission.source || "—"} />
            {submission.pageUrl && (
              <DetailRow
                label="Page URL"
                value={
                  <span className="text-xs text-[var(--primary)] truncate block max-w-[250px]" title={submission.pageUrl}>
                    {submission.pageUrl}
                  </span>
                }
              />
            )}
            {utmTags.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">UTM Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {utmTags.map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-[10px]">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lead Info */}
      {submission.lead && (
        <>
          <SectionTitle icon={Tag} title="Lead" />
          <div className="space-y-1 mb-3">
            <DetailRow
              label="Name"
              value={submission.lead.contact?.name || "—"}
            />
            <DetailRow
              label="Email"
              value={submission.lead.contact?.email || "—"}
            />
            <DetailRow
              label="Phone"
              value={submission.lead.contact?.phone || "—"}
            />
            <DetailRow
              label="Status"
              value={
                submission.lead.status ? (
                  <Badge variant={submission.lead.status === "CONVERTED" ? "success" : "default"} className="text-[10px]">
                    {submission.lead.status}
                  </Badge>
                ) : "—"
              }
            />
            <DetailRow
              label="Lead Source"
              value={submission.lead.source || "—"}
            />
            {submission.leadId && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.hash = "#/leads";
                    onClose();
                  }}
                  className="text-xs gap-1.5"
                >
                  <ExternalLink size={12} />
                  View Lead
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Form Fields / Payload */}
      {formFields.length > 0 && (
        <>
          <SectionTitle icon={Calendar} title="Form Data" />
          <div className="space-y-1">
            {formFields.map(([key, value]) => (
              <DetailRow
                key={key}
                label={key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                value={typeof value === "object" ? JSON.stringify(value) : String(value)}
              />
            ))}
          </div>
        </>
      )}

      {formFields.length === 0 && !submission.source && !submission.lead && (
        <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
          No additional data available for this submission.
        </p>
      )}
    </Drawer>
  );
}
