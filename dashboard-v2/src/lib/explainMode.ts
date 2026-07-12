export interface ExplainStep {
  page: string;
  filters?: Record<string, string>;
  highlightId?: string;
  narration: string;
}

export const EXPLAIN_FLOW_START_EVENT = 'explain-flow:start';

export function startExplainFlow(steps: ExplainStep[]) {
  if (!steps || steps.length === 0) return;
  window.dispatchEvent(new CustomEvent<ExplainStep[]>(EXPLAIN_FLOW_START_EVENT, { detail: steps }));
}
