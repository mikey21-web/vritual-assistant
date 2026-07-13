import toast from "react-hot-toast";
import { Brain } from "lucide-react";

interface JarvisFinding {
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

const severityStyles: Record<
  JarvisFinding["severity"],
  { border: string; tint: string; icon: string }
> = {
  info: {
    border: "border-l-emerald-500",
    tint: "bg-emerald-50 dark:bg-emerald-950/20",
    icon: "text-emerald-500",
  },
  warning: {
    border: "border-l-amber-500",
    tint: "bg-amber-50 dark:bg-amber-950/20",
    icon: "text-amber-500",
  },
  critical: {
    border: "border-l-red-500",
    tint: "bg-red-50 dark:bg-red-950/20",
    icon: "text-red-500",
  },
};

/**
 * showJarvisToast – displays a non-urgent Jarvis suggestion as a styled toast.
 * Call it directly from any component or hook when Jarvis has a finding to share.
 *
 * @example
 * import { showJarvisToast } from "./jarvis/JarvisToast";
 * showJarvisToast({ title: "Lead spike detected", description: "12 new leads in the last hour", severity: "info" });
 */
export function showJarvisToast(finding: JarvisFinding) {
  const styles = severityStyles[finding.severity];

  toast.custom(
    (t) => (
      <div
        className={`flex items-start gap-3 border-l-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg ${styles.border}`}
        style={{
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.2s, transform 0.2s",
        }}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.tint}`}
        >
          <Brain size={16} className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {finding.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
            {finding.description}
          </p>
        </div>
      </div>
    ),
    { duration: 5000, position: "bottom-right" },
  );
}
