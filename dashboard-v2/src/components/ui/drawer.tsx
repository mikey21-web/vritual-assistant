import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    document.body.classList.add("overlay-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("overlay-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered via portal straight to document.body. Without this, `fixed`
  // positioning here is at the mercy of whatever ancestor the page happens
  // to render inside — any transform/filter/animation-fill-mode:forwards
  // upstream turns into a new containing block and clips this under the
  // topbar instead of covering the real viewport (seen on Accounting).
  // Portaling to body sidesteps the whole class of bug for good.
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`flex h-full w-full ${width} flex-col bg-[var(--card)] border-l border-[var(--border)] shadow-[var(--shadow-lg)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h2 id="drawer-title" className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
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

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
