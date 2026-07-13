import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Compass } from "lucide-react";
import { EXPLAIN_FLOW_START_EVENT, type ExplainStep } from "../lib/explainMode";
import { setPendingFilter } from "../lib/pendingSearch";

function applyStep(step: ExplainStep) {
  setPendingFilter(step.page, { filters: step.filters, highlightId: step.highlightId });
  window.location.hash = "/" + step.page;
}

export default function ExplainModePlayer() {
  const [steps, setSteps] = useState<ExplainStep[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent<ExplainStep[]>).detail;
      if (!detail || detail.length === 0) return;
      setSteps(detail);
      setIndex(0);
      applyStep(detail[0]);
    };
    window.addEventListener(EXPLAIN_FLOW_START_EVENT, onStart);
    return () => window.removeEventListener(EXPLAIN_FLOW_START_EVENT, onStart);
  }, []);

  if (steps.length === 0) return null;

  const step = steps[index];
  const close = () => setSteps([]);
  const next = () => {
    if (index >= steps.length - 1) return;
    const nextIndex = index + 1;
    setIndex(nextIndex);
    applyStep(steps[nextIndex]);
  };
  const prev = () => {
    if (index <= 0) return;
    const prevIndex = index - 1;
    setIndex(prevIndex);
    applyStep(steps[prevIndex]);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed top-0 inset-x-0 z-40 flex justify-center px-4 pt-3"
      >
        <div className="flex items-center gap-3 max-w-2xl w-full rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg px-4 py-2.5">
          <Compass size={16} className="text-[var(--primary)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Step {index + 1} of {steps.length}
            </div>
            <div className="text-sm text-[var(--foreground)] truncate">{step.narration}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={prev} disabled={index === 0}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-30 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <button onClick={next} disabled={index === steps.length - 1}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-30 transition-colors">
              <ChevronRight size={15} />
            </button>
            <button onClick={close}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
