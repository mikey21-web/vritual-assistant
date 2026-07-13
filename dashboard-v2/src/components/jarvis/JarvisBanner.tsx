import { useState, useMemo } from "react";
import { Brain, X } from "lucide-react";

interface Finding {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  timestamp: Date;
}

interface JarvisBannerProps {
  findings: Finding[];
}

const severityConfig = {
  info: {
    border: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-800 dark:text-blue-200",
    icon: "text-blue-500",
    label: "Info",
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-800 dark:text-amber-200",
    icon: "text-amber-500",
    label: "Warning",
  },
  critical: {
    border: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    text: "text-red-800 dark:text-red-200",
    icon: "text-red-500",
    label: "Critical",
  },
};

/**
 * JarvisBanner – a dismissible banner that appears at the top of the page
 * for critical Jarvis intelligence findings. Shows the most recent critical
 * finding, or falls back to the most recent warning / info finding.
 */
export function JarvisBanner({ findings }: JarvisBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeFinding = useMemo(() => {
    const sorted = [...findings].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    const critical = sorted.find((f) => f.severity === "critical");
    if (critical) return critical;
    const warning = sorted.find((f) => f.severity === "warning");
    if (warning) return warning;
    return sorted[0] ?? null;
  }, [findings]);

  if (!activeFinding || dismissedIds.has(activeFinding.id)) return null;

  const config = severityConfig[activeFinding.severity];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 border-l-4 px-4 py-3 ${config.border} ${config.bg} ${config.text}`}
    >
      <Brain size={18} className={`mt-0.5 shrink-0 ${config.icon}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{activeFinding.title}</p>
        <p className="text-xs opacity-80 mt-0.5">{activeFinding.description}</p>
      </div>
      <button
        onClick={() =>
          setDismissedIds((prev) => new Set(prev).add(activeFinding.id))
        }
        aria-label="Dismiss finding"
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}
