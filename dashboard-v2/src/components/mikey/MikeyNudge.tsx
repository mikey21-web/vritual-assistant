import { useState, useEffect, useRef } from "react";
import { Brain } from "lucide-react";

interface MikeyNudgeProps {
  message: string;
  icon?: React.ReactNode;
  position?: "bottom-right" | "top-right";
}

const positionClasses: Record<string, string> = {
  "bottom-right": "bottom-6 right-6",
  "top-right": "top-6 right-6",
};

/**
 * MikeyNudge – a small, non-intrusive inline tooltip-style component that
 * displays contextual Mikey nudges. Auto-dismisses after 8 seconds with a
 * fade-out animation.
 */
export function MikeyNudge({
  message,
  icon,
  position = "bottom-right",
}: MikeyNudgeProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setFading(true);
      setTimeout(() => setVisible(false), 400);
    }, 8000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed z-[60] flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 shadow-md ${positionClasses[position]}`}
      style={{
        opacity: fading ? 0 : 1,
        transform: fading ? "translateY(4px)" : "translateY(0)",
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
      }}
    >
      <span className="shrink-0 text-[var(--primary)]">
        {icon ?? <Brain size={14} />}
      </span>
      <span className="text-xs text-[var(--foreground)] leading-relaxed">
        {message}
      </span>
    </div>
  );
}
