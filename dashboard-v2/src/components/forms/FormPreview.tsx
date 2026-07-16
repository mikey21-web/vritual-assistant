import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import type { FormField } from './FieldEditor';
import type { FormStep } from './StepManager';
import type { ConditionalLogic } from './ConditionalLogicEditor';

interface FormData {
  id: string;
  name: string;
  steps: FormStep[];
  fields: FormField[];
  settings?: {
    redirectUrl?: string;
    confirmationMessage?: string;
    sendConfirmationEmail?: boolean;
    embedTheme?: 'light' | 'dark';
  };
}

interface Props {
  form: FormData;
}

function evaluateCondition(logic: ConditionalLogic, formValues: Record<string, any>): boolean {
  if (!logic.enabled || !logic.sourceField) return true;
  const sourceValue = formValues[logic.sourceField];
  if (sourceValue === undefined || sourceValue === '') return true; // Don't hide if source isn't filled

  switch (logic.operator) {
    case 'equals':
      return String(sourceValue) === logic.value;
    case 'not_equals':
      return String(sourceValue) !== logic.value;
    case 'contains':
      return String(sourceValue).toLowerCase().includes(logic.value.toLowerCase());
    case 'greater_than':
      return Number(sourceValue) > Number(logic.value);
    case 'less_than':
      return Number(sourceValue) < Number(logic.value);
    case 'is_one_of': {
      const values = logic.value.split(',').map((v) => v.trim());
      return values.includes(String(sourceValue));
    }
    default:
      return true;
  }
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any;
  onChange: (key: string, val: any) => void;
}) {
  const baseInputClass =
    'w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20';
  const baseLabelClass = 'block text-sm font-medium text-[var(--foreground)] mb-1';

  if (field.type === 'heading') {
    return (
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[var(--foreground)]">{field.label}</h3>
        {field.description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div className="mb-4">
        <p className="text-sm text-[var(--muted-foreground)]">{field.label}</p>
        {field.description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{field.description}</p>}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className={baseLabelClass}>
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {field.description && <p className="text-xs text-[var(--muted-foreground)] mb-1.5">{field.description}</p>}

      {field.type === 'textarea' && (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className={`${baseInputClass} h-auto py-2 resize-y min-h-[80px]`}
        />
      )}

      {field.type === 'select' && (
        <select
          value={value || ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          required={field.required}
          className={baseInputClass}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.type === 'multi_select' && (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => {
            const checked = Array.isArray(value) && value.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const arr = Array.isArray(value) ? [...value] : [];
                    if (checked) {
                      onChange(field.fieldKey, arr.filter((v: string) => v !== opt));
                    } else {
                      onChange(field.fieldKey, [...arr, opt]);
                    }
                  }}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/20"
                />
                <span className="text-sm text-[var(--foreground)]">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {field.type === 'checkbox' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(field.fieldKey, e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/20"
          />
          <span className="text-sm text-[var(--foreground)]">{field.placeholder || field.label}</span>
        </label>
      )}

      {field.type === 'radio' && (
        <div className="space-y-1.5">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`preview-${field.fieldKey}`}
                value={opt}
                checked={value === opt}
                onChange={(e) => onChange(field.fieldKey, e.target.value)}
                className="border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/20"
              />
              <span className="text-sm text-[var(--foreground)]">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === 'file' && (
        <input
          type="file"
          onChange={(e) => onChange(field.fieldKey, e.target.files?.[0]?.name || '')}
          className="block w-full text-sm text-[var(--foreground)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--primary-light)] file:text-[var(--primary)] hover:file:bg-[var(--primary)]/10"
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          required={field.required}
          className={baseInputClass}
        />
      )}

      {field.type === 'datetime' && (
        <input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          required={field.required}
          className={baseInputClass}
        />
      )}

      {/* text, email, phone, number */}
      {(field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number') && (
        <input
          type={
            field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'
          }
          value={value || ''}
          onChange={(e) => onChange(field.fieldKey, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={baseInputClass}
        />
      )}
    </div>
  );
}

export default function FormPreview({ form }: Props) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  const sortedSteps = useMemo(
    () => [...form.steps].sort((a, b) => a.order - b.order),
    [form.steps]
  );

  const sortedFields = useMemo(
    () => [...form.fields].sort((a, b) => a.order - b.order),
    [form.fields]
  );

  const currentStep = sortedSteps[currentStepIndex];
  const currentFields = useMemo(() => {
    return sortedFields.filter((f) => f.stepId === currentStep?.id);
  }, [sortedFields, currentStep?.id]);

  const visibleFields = useMemo(() => {
    return currentFields.filter((f) => {
      if (!f.conditionalLogic) return true;
      return evaluateCondition(f.conditionalLogic, formValues);
    });
  }, [currentFields, formValues]);

  const handleValueChange = useCallback((key: string, val: any) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleNext = () => {
    if (currentStepIndex < sortedSteps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formValues);
    setSubmitted(true);
  };

  const resetForm = () => {
    setFormValues({});
    setCurrentStepIndex(0);
    setSubmitted(false);
  };

  if (submitted) {
    const msg = form.settings?.confirmationMessage || "Thanks! We'll be in touch.";
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <Send size={24} className="text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">Form Submitted</h3>
        <p className="text-sm text-[var(--muted-foreground)] max-w-md">{msg}</p>
        <button
          type="button"
          onClick={resetForm}
          className="mt-6 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Step indicator */}
      {sortedSteps.length > 1 && (
        <div className="flex items-center gap-2 mb-6">
          {sortedSteps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isComplete = idx < currentStepIndex;
            return (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--primary)] text-white'
                        : isComplete
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {isComplete ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-xs hidden sm:inline ${
                      isActive ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted-foreground)]'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {idx < sortedSteps.length - 1 && (
                  <div
                    className={`flex-1 h-px ${
                      isComplete ? 'bg-emerald-300' : 'bg-[var(--border)]'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step title */}
      {currentStep && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[var(--foreground)]">{currentStep.title}</h3>
          {currentStep.description && (
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{currentStep.description}</p>
          )}
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-12 gap-x-4">
        {visibleFields.map((field) => {
          const widthClass =
            field.width === 'half'
              ? 'col-span-12 sm:col-span-6'
              : field.width === 'third'
              ? 'col-span-12 sm:col-span-4'
              : 'col-span-12';
          return (
            <div key={field.id} className={widthClass}>
              <FieldRenderer
                field={field}
                value={formValues[field.fieldKey]}
                onChange={handleValueChange}
              />
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {currentFields.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">No fields in this step.</p>
        </div>
      )}

      {/* All fields hidden by conditional logic */}
      {currentFields.length > 0 && visibleFields.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--muted-foreground)]">
            All fields in this step are hidden based on conditional logic.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} />
          Back
        </button>

        {currentStepIndex < sortedSteps.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Next
            <ChevronRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Send size={14} />
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
