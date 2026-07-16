import { useState } from 'react';
import { Eye, EyeOff, X, Plus } from 'lucide-react';

export interface ConditionalLogic {
  enabled: boolean;
  sourceField: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_one_of';
  value: string;
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'is_one_of', label: 'is one of' },
] as const;

interface Props {
  fields: { fieldKey: string; label: string; type: string; options?: string[] }[];
  logic: ConditionalLogic;
  onChange: (logic: ConditionalLogic) => void;
}

export default function ConditionalLogicEditor({ fields, logic, onChange }: Props) {
  const [multiValue, setMultiValue] = useState<string>('');
  const enabled = logic.enabled;

  const toggleEnabled = () => {
    onChange({ ...logic, enabled: !logic.enabled });
  };

  const sourceField = fields.find((f) => f.fieldKey === logic.sourceField);
  const hasOptions = sourceField?.options && sourceField.options.length > 0;

  const getPreviewText = () => {
    if (!enabled || !logic.sourceField) return '';
    const fieldLabel = sourceField?.label || logic.sourceField;
    const operatorLabel = OPERATORS.find((o) => o.value === logic.operator)?.label || logic.operator;
    const val = logic.value || '...';
    return `Show when ${fieldLabel} ${operatorLabel} ${val}`;
  };

  const multiValues = logic.value ? logic.value.split(',').filter(Boolean) : [];

  const addMultiValue = () => {
    if (!multiValue.trim()) return;
    const newValues = [...multiValues, multiValue.trim()];
    onChange({ ...logic, value: newValues.join(',') });
    setMultiValue('');
  };

  const removeMultiValue = (idx: number) => {
    const newValues = multiValues.filter((_, i) => i !== idx);
    onChange({ ...logic, value: newValues.join(',') });
  };

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-3 mt-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[var(--foreground)] flex items-center gap-1.5">
          {enabled ? <Eye size={13} /> : <EyeOff size={13} />}
          Conditional Logic
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggleEnabled}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/20 ${
            enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 pl-1">
          {/* Source field */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Source Field</label>
            <select
              value={logic.sourceField}
              onChange={(e) => onChange({ ...logic, sourceField: e.target.value, value: '' })}
              className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              <option value="">Select a field...</option>
              {fields.map((f) => (
                <option key={f.fieldKey} value={f.fieldKey}>
                  {f.label} ({f.fieldKey})
                </option>
              ))}
            </select>
          </div>

          {/* Operator */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">Condition</label>
            <select
              value={logic.operator}
              onChange={(e) => onChange({ ...logic, operator: e.target.value as ConditionalLogic['operator'] })}
              className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs text-[var(--muted-foreground)] mb-1">
              {logic.operator === 'is_one_of' ? 'Values' : 'Value'}
            </label>

            {logic.operator === 'is_one_of' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {multiValues.map((v, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs"
                    >
                      {v}
                      <button
                        type="button"
                        onClick={() => removeMultiValue(i)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  {hasOptions ? (
                    <select
                      value={multiValue}
                      onChange={(e) => setMultiValue(e.target.value)}
                      className="flex-1 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    >
                      <option value="">Select...</option>
                      {sourceField.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={multiValue}
                      onChange={(e) => setMultiValue(e.target.value)}
                      placeholder="Add value..."
                      className="flex-1 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMultiValue())}
                    />
                  )}
                  <button
                    type="button"
                    onClick={addMultiValue}
                    disabled={!multiValue.trim()}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--accent)] transition-colors disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ) : hasOptions ? (
              <select
                value={logic.value}
                onChange={(e) => onChange({ ...logic, value: e.target.value })}
                className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                <option value="">Select...</option>
                {sourceField.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={logic.value}
                onChange={(e) => onChange({ ...logic, value: e.target.value })}
                placeholder="Value to compare..."
                className="w-full h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            )}
          </div>

          {/* Preview summary */}
          {logic.sourceField && (
            <p className="text-xs text-[var(--muted-foreground)] italic pt-1 border-t border-[var(--border)]">
              {getPreviewText()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
