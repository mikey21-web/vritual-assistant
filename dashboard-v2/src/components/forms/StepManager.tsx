import { Plus, X, GripVertical, ChevronRight, ChevronLeft } from 'lucide-react';

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  order: number;
}

interface Props {
  steps: FormStep[];
  currentStepId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onUpdateStep: (id: string, data: Partial<FormStep>) => void;
  onReorder: (steps: FormStep[]) => void;
  fieldCounts?: Record<string, number>;
}

export default function StepManager({
  steps,
  currentStepId,
  onSelectStep,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  onReorder,
  fieldCounts = {},
}: Props) {
  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    newSteps.forEach((s, i) => (s.order = i));
    onReorder(newSteps);
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
          Steps
        </h4>
        <button
          type="button"
          onClick={onAddStep}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border)] text-xs text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          <Plus size={13} />
          Add Step
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {steps.length === 0 && (
          <p className="text-xs text-[var(--muted-foreground)] py-2">No steps yet. Add one to get started.</p>
        )}

        {steps
          .sort((a, b) => a.order - b.order)
          .map((step, index) => {
            const isSelected = step.id === currentStepId;
            const count = fieldCounts[step.id] || 0;

            return (
              <div
                key={step.id}
                className={`relative flex-shrink-0 group flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all min-w-[120px] ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--ring)]'
                }`}
                onClick={() => onSelectStep(step.id)}
              >
                {/* Reorder buttons */}
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, -1);
                    }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20"
                  >
                    <ChevronLeft size={10} />
                  </button>
                  <button
                    type="button"
                    disabled={index === steps.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(index, 1);
                    }}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20"
                  >
                    <ChevronRight size={10} />
                  </button>
                </div>

                <GripVertical size={13} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  {isSelected ? (
                    <input
                      value={step.title}
                      onChange={(e) => onUpdateStep(step.id, { title: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Step title"
                      className="w-full bg-transparent text-sm font-medium focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{step.title || 'Untitled'}</p>
                  )}
                  {step.description && !isSelected && (
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">{step.description}</p>
                  )}
                </div>

                {/* Field count */}
                <span className="text-[10px] text-[var(--muted-foreground)] bg-[var(--secondary)] px-1.5 py-0.5 rounded shrink-0">
                  {count} field{count !== 1 ? 's' : ''}
                </span>

                {/* Remove button */}
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStep(step.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* If only one step, show a quick editor inline */}
      {steps.length === 1 && currentStepId && (
        <div className="mt-2 flex gap-3">
          <input
            value={steps[0].description || ''}
            onChange={(e) => onUpdateStep(steps[0].id, { description: e.target.value })}
            placeholder="Step description (optional)"
            className="flex-1 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
        </div>
      )}
    </div>
  );
}
