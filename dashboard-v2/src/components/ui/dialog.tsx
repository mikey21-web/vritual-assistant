import * as React from "react";
import { X } from "lucide-react";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`w-full ${maxWidth} rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
            {description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
