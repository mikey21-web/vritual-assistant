import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { fetchFormPublic, submitForm } from '../lib/data';
import FormFieldRenderer from '../components/forms/FormFieldRenderer';
import type { FormFieldConfig, ConditionalLogic } from '../components/forms/FormFieldRenderer';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormStep {
  id: string;
  title: string;
  description?: string;
  order: number;
}

interface SubmissionConfig {
  redirectUrl?: string;
  confirmationMessage?: string;
  sendConfirmationEmail?: boolean;
}

interface EmbedConfig {
  theme?: Record<string, unknown>;
}

interface FormConfig {
  id: string;
  name: string;
  fields: FormFieldConfig[];
  steps: FormStep[];
  submissionConfig?: SubmissionConfig;
  embedConfig?: EmbedConfig;
}

interface UTMData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUTMParams(): UTMData {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_term: params.get('utm_term') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
  };
}

function evaluateCondition(
  condition: ConditionalLogic['conditions'][number],
  allValues: Record<string, unknown>
): boolean {
  const fieldValue = allValues[condition.fieldKey];

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value;
    case 'neq':
      return fieldValue !== condition.value;
    case 'gt': {
      const a = Number(fieldValue);
      const b = Number(condition.value);
      return !isNaN(a) && !isNaN(b) && a > b;
    }
    case 'lt': {
      const a = Number(fieldValue);
      const b = Number(condition.value);
      return !isNaN(a) && !isNaN(b) && a < b;
    }
    case 'in': {
      const arr = Array.isArray(condition.value)
        ? (condition.value as unknown[])
        : [condition.value];
      return arr.includes(fieldValue);
    }
    case 'contains': {
      if (typeof fieldValue === 'string' && typeof condition.value === 'string') {
        return fieldValue.toLowerCase().includes(condition.value.toLowerCase());
      }
      return false;
    }
    default:
      return true;
  }
}

function evaluateConditionalLogic(
  logic: ConditionalLogic | undefined,
  allValues: Record<string, unknown>
): boolean {
  if (!logic || !logic.conditions || logic.conditions.length === 0) {
    return true;
  }

  const allMet = logic.conditions.every((c) => evaluateCondition(c, allValues));

  if (logic.action === 'hide') {
    return !allMet; // show only when conditions are NOT met
  }
  // 'show' or 'require' → show when conditions are met
  return allMet;
}

function shouldShowField(
  field: FormFieldConfig,
  allValues: Record<string, unknown>
): boolean {
  return evaluateConditionalLogic(field.conditionalLogic, allValues);
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <Loader2
      className={`animate-spin text-blue-600 ${className}`}
      size={size}
    />
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 1 ? Math.round((current / (total - 1)) * 100) : total === 1 ? 100 : 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">
          Step {current + 1} of {total}
        </span>
        <span className="text-xs font-medium text-gray-500">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-blue-600"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  steps,
  currentIndex,
  onNavigate,
}: {
  steps: { id: string; title: string }[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  if (steps.length <= 1) return null;

  return (
    <nav aria-label="Form steps" className="w-full">
      <ol className="flex items-center justify-center gap-0">
        {steps.map((step, idx) => {
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex;

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onNavigate(idx)}
                disabled={idx > currentIndex}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check size={12} className="shrink-0" />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={`h-px w-6 mx-1 ${
                    idx < currentIndex ? 'bg-blue-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Confirmation Screen ─────────────────────────────────────────────────────

function ConfirmationScreen({
  message,
  redirectUrl,
  onReset,
}: {
  message?: string;
  redirectUrl?: string;
  onReset: () => void;
}) {
  const [redirectSeconds, setRedirectSeconds] = useState(5);

  useEffect(() => {
    if (!redirectUrl) return;

    const timer = setInterval(() => {
      setRedirectSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          window.location.href = redirectUrl;
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [redirectUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center text-center py-12 px-4"
    >
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
        <CheckCircle size={32} className="text-green-600" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Submission Received!
      </h2>

      <p className="text-gray-600 max-w-md mb-8">
        {message || 'Thank you for your submission. We will get back to you shortly.'}
      </p>

      {redirectUrl && (
        <p className="text-sm text-gray-400 mb-6">
          Redirecting to{' '}
          <span className="text-blue-600 font-medium inline-flex items-center gap-1">
            {redirectUrl.replace(/^https?:\/\//, '')}
            <ExternalLink size={12} />
          </span>{' '}
          in {redirectSeconds} seconds...
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
      >
        <ClipboardList size={16} />
        Submit another response
      </button>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FormRendererPage() {
  const { id } = useParams<{ id: string }>();

  // ── State ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const startedAtRef = useRef<string>(new Date().toISOString());

  // ── Fetch form ─────────────────────────────────────────────────────────
  const loadForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setCurrentStep(0);
    setValues({});
    setErrors({});
    setSubmissionError(null);
    startedAtRef.current = new Date().toISOString();

    try {
      const data = await fetchFormPublic(id);
      setForm(data);

      // Initialise default values
      const initial: Record<string, unknown> = {};
      for (const field of data.fields ?? []) {
        if (field.type === 'checkbox') {
          initial[field.fieldKey] = false;
        } else if (field.type === 'multi-select') {
          initial[field.fieldKey] = [];
        } else {
          initial[field.fieldKey] = '';
        }
      }
      setValues(initial);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load form';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  // ── Derive visible fields per step ─────────────────────────────────────
  const sortedSteps = useMemo(() => {
    if (!form?.steps) return [];
    return [...form.steps].sort((a, b) => a.order - b.order);
  }, [form]);

  const totalSteps = sortedSteps.length;

  const visibleFields = useMemo(() => {
    if (!form?.fields) return [];
    return form.fields.filter((f) => shouldShowField(f, values));
  }, [form, values]);

  const visibleFieldsByStep = useMemo(() => {
    if (sortedSteps.length === 0) {
      // No steps defined — treat all visible fields as one step
      return visibleFields.length > 0 ? [visibleFields] : [];
    }

    return sortedSteps.map((step) => {
      // Fields can be assigned to a step via field.step (index) or step id
      return visibleFields.filter((f) => {
        if (f.step !== undefined && f.step !== null) {
          return f.step === sortedSteps.indexOf(step);
        }
        return false;
      });
    });
  }, [sortedSteps, visibleFields]);

  // If no steps are defined, create a single implicit step
  const steps = useMemo(() => {
    if (sortedSteps.length > 0) return sortedSteps;
    if (form?.fields && form.fields.length > 0) {
      return [{ id: 'default', title: form.name || 'Form', order: 0 }];
    }
    return [];
  }, [sortedSteps, form]);

  const fieldsForCurrentStep = useMemo(() => {
    if (visibleFieldsByStep.length > 0 && currentStep < visibleFieldsByStep.length) {
      return visibleFieldsByStep[currentStep];
    }
    // Fallback: if step indexing doesn't match, show all fields on step 0
    if (currentStep === 0) return visibleFields;
    return [];
  }, [visibleFieldsByStep, currentStep, visibleFields]);

  // ── Validation ─────────────────────────────────────────────────────────
  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of fieldsForCurrentStep) {
      // Skip display-only types
      if (field.type === 'heading' || field.type === 'paragraph') continue;

      const value = values[field.fieldKey];

      // Required check
      const isRequired =
        field.required ||
        (field.conditionalLogic?.action === 'require' &&
          evaluateConditionalLogic(field.conditionalLogic, values));

      if (isRequired) {
        if (value === undefined || value === null || value === '') {
          newErrors[field.fieldKey] = `${field.label} is required`;
          continue;
        }
        if (Array.isArray(value) && value.length === 0) {
          newErrors[field.fieldKey] = `${field.label} is required`;
          continue;
        }
      }

      // Type-specific validation
      if (value && typeof value === 'string') {
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.fieldKey] = 'Please enter a valid email address';
          }
        }
        if (field.type === 'phone') {
          const phoneClean = value.replace(/[\s\-\+\(\)\.]/g, '');
          if (phoneClean.length < 7) {
            newErrors[field.fieldKey] = 'Please enter a valid phone number';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fieldsForCurrentStep, values]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const canGoNext = currentStep < steps.length - 1;
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    setErrors({});
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [validateStep, steps.length]);

  const handleBack = useCallback(() => {
    setErrors({});
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleStepClick = useCallback(
    (index: number) => {
      if (index <= currentStep) {
        setErrors({});
        setCurrentStep(index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [currentStep]
  );

  // ── Field change handler ───────────────────────────────────────────────
  const handleFieldChange = useCallback(
    (fieldKey: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldKey]: value }));
      // Clear error for this field on change
      setErrors((prev) => {
        if (!prev[fieldKey]) return prev;
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    },
    []
  );

  // ── Submission ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!validateStep()) return;
    if (!form) return;

    setSubmitting(true);
    setSubmissionError(null);

    // Build payload
    const utm = parseUTMParams();
    const payload: Record<string, unknown> = {};

    for (const field of form.fields ?? []) {
      if (field.type === 'heading' || field.type === 'paragraph') continue;
      payload[field.fieldKey] = values[field.fieldKey] ?? null;
    }

    const data = {
      payload,
      _source: 'embed',
      _pageUrl: window.location.href,
      _utm: utm,
      _startedAt: startedAtRef.current,
      _completedAt: new Date().toISOString(),
    };

    try {
      await submitForm(form.id, data);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Submission failed. Please try again.';
      setSubmissionError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [validateStep, form, values]);

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    loadForm();
  }, [loadForm]);

  // ── Render: Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <p className="text-sm text-gray-500 animate-pulse">Loading form...</p>
        </div>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Form not found
          </h2>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={loadForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render: No form ────────────────────────────────────────────────────
  if (!form) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No form data available</p>
        </div>
      </div>
    );
  }

  // ── Render: Confirmation ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <ConfirmationScreen
            message={form.submissionConfig?.confirmationMessage}
            redirectUrl={form.submissionConfig?.redirectUrl}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  // ── Render: Form steps ─────────────────────────────────────────────────
  const hasDisplayFields = fieldsForCurrentStep.length > 0;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 lg:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {form.name}
          </h1>
          {form.steps &&
            form.steps.length > 0 &&
            currentStep < form.steps.length && (
              <p className="text-sm text-gray-500 mt-1">
                {form.steps[currentStep]?.description ?? ''}
              </p>
            )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <ProgressBar current={currentStep} total={steps.length} />
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator
            steps={steps}
            currentIndex={currentStep}
            onNavigate={handleStepClick}
          />
        </div>

        {/* Submission error banner */}
        {submissionError && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">Submission failed</p>
              <p className="text-sm text-red-600 mt-0.5">{submissionError}</p>
            </div>
          </div>
        )}

        {/* Fields */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="space-y-6">
              {hasDisplayFields ? (
                fieldsForCurrentStep.map((field) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FormFieldRenderer
                      field={field}
                      value={values[field.fieldKey]}
                      onChange={(val) => handleFieldChange(field.fieldKey, val)}
                      errors={errors}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 italic">
                    No fields in this step
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            {canGoBack && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            )}
          </div>

          <div>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {submitting ? (
                  <>
                    <Spinner size={16} />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit
                    <CheckCircle size={16} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
              >
                Next
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-xs text-gray-400">
          {form.submissionConfig?.sendConfirmationEmail
            ? 'You will receive a confirmation email after submission.'
            : ''}
        </p>
      </div>
    </div>
  );
}
