import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchForms,
  fetchForm,
  createForm,
  updateForm,
  addFormField,
  updateFormField,
  deleteFormField,
} from '../lib/data';
import {
  Plus,
  FormInput,
  LayoutDashboard,
  Eye,
  Code,
  Settings,
  Loader2,
  AlertCircle,
  X,
  Check,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FieldTypeIcon, FIELD_TYPE_OPTIONS, getFieldTypeLabel } from '../components/forms/FieldTypeIcon';
import FieldEditor from '../components/forms/FieldEditor';
import type { FormField } from '../components/forms/FieldEditor';
import StepManager from '../components/forms/StepManager';
import type { FormStep } from '../components/forms/StepManager';
import FormPreview from '../components/forms/FormPreview';
import EmbedPanel from '../components/forms/EmbedPanel';

const FORM_TYPES = [
  { value: 'custom', label: 'Custom' },
  { value: 'buyer-inquiry', label: 'Buyer Inquiry' },
  { value: 'seller-intake', label: 'Seller Intake' },
  { value: 'site-visit', label: 'Site Visit' },
  { value: 'open-house', label: 'Open House' },
  { value: 'valuation', label: 'Valuation' },
  { value: 'broker-registration', label: 'Broker Registration' },
  { value: 'referral', label: 'Referral' },
];

type Tab = 'fields' | 'preview' | 'embed' | 'settings' | 'submissions';

export default function FormsPage() {
  // ─── Lists ────────────────────────────────────────────────
  const [forms, setForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);

  // ─── New form ─────────────────────────────────────────────
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [creating, setCreating] = useState(false);

  // ─── Selected form ───────────────────────────────────────
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Editor state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('fields');
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // ─── Auto-save debounce ───────────────────────────────────
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formLoadRef = useRef<string | null>(null);

  // ─── Computed values ──────────────────────────────────────
  const fields: FormField[] = useMemo(() => formData?.fields || [], [formData?.fields]);
  const steps: FormStep[] = useMemo(() => formData?.steps || [], [formData?.steps]);

  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  );

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
  );

  const currentStepFields = useMemo(
    () => sortedFields.filter((f) => f.stepId === currentStepId),
    [sortedFields, currentStepId]
  );

  const fieldCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    fields.forEach((f) => {
      if (f.stepId) counts[f.stepId] = (counts[f.stepId] || 0) + 1;
    });
    return counts;
  }, [fields]);

  // ─── Fetch forms list ─────────────────────────────────────
  const loadForms = useCallback(async () => {
    setLoadingForms(true);
    setFormsError(null);
    try {
      const data = await fetchForms();
      setForms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setFormsError(err.message || 'Failed to load forms');
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // ─── Fetch single form ────────────────────────────────────
  const loadForm = useCallback(async (id: string) => {
    setLoadingForm(true);
    setFormError(null);
    try {
      const data = await fetchForm(id);
      // Ensure steps array exists
      if (!data.steps || !Array.isArray(data.steps)) {
        data.steps = [{ id: crypto.randomUUID(), title: 'Step 1', description: '', order: 0 }];
      }
      // Ensure fields exist
      if (!data.fields || !Array.isArray(data.fields)) {
        data.fields = [];
      }
      // Ensure settings exist
      if (!data.settings) {
        data.settings = {
          redirectUrl: '',
          confirmationMessage: "Thanks! We'll be in touch.",
          sendConfirmationEmail: false,
          embedTheme: 'light',
        };
      }
      setFormData(data);
      // Set default step
      const sorted = [...data.steps].sort((a: FormStep, b: FormStep) => a.order - b.order);
      if (sorted.length > 0 && !currentStepId) {
        setCurrentStepId(sorted[0].id);
      }
      setExpandedFieldId(null);
      setActiveTab('fields');
    } catch (err: any) {
      setFormError(err.message || 'Failed to load form');
      setFormData(null);
    } finally {
      setLoadingForm(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFormId && selectedFormId !== formLoadRef.current) {
      formLoadRef.current = selectedFormId;
      loadForm(selectedFormId);
    }
  }, [selectedFormId, loadForm]);

  // ─── Create form ─────────────────────────────────────────
  const handleCreateForm = async () => {
    if (!newFormName.trim()) return;
    setCreating(true);
    try {
      const result = await createForm({ name: newFormName.trim() });
      const newId = result?.id || result?._id;
      if (!newId) throw new Error('No form ID returned');
      await loadForms();
      setNewFormName('');
      setShowNewForm(false);
      setSelectedFormId(newId);
      toast.success('Form created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create form');
    } finally {
      setCreating(false);
    }
  };

  // ─── Update form (debounced) ──────────────────────────────
  const debouncedUpdateForm = useCallback(
    (data: any) => {
      if (!formData?.id) return;
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        try {
          await updateForm(formData.id, data);
          // Update local state optimistically
          setFormData((prev: any) => (prev ? { ...prev, ...data } : prev));
        } catch (err: any) {
          toast.error(err.message || 'Failed to save');
        }
      }, 800);
    },
    [formData?.id]
  );

  // ─── Update field (with debounce) ─────────────────────────
  const handleFieldChange = useCallback(
    (fieldId: string, data: Partial<FormField>) => {
      // Update local state immediately
      setFormData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: (prev.fields || []).map((f: FormField) =>
            f.id === fieldId ? { ...f, ...data } : f
          ),
        };
      });

      // Save to API with debounce
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        if (!formData?.id) return;
        try {
          await updateFormField(formData.id, fieldId, data);
        } catch (err: any) {
          toast.error(err.message || 'Failed to save field');
        }
      }, 800);
    },
    [formData?.id]
  );

  // ─── Add field ────────────────────────────────────────────
  const handleAddField = useCallback(
    async (type: string) => {
      if (!formData?.id || !currentStepId) return;
      const count = currentStepFields.length;
      const defaultLabel = getFieldTypeLabel(type);
      const fieldKey = `${type}_${count + 1}`;

      try {
        const newField = await addFormField(formData.id, {
          label: defaultLabel,
          fieldKey,
          type,
          required: false,
          width: 'full',
          order: count,
          stepId: currentStepId,
        });

        // Refresh form to get the new field with its ID
        const updatedForm = await fetchForm(formData.id);
        setFormData(updatedForm);
        setShowFieldPicker(false);
        toast.success(`${defaultLabel} field added`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to add field');
      }
    },
    [formData?.id, currentStepId, currentStepFields.length]
  );

  // ─── Delete field ─────────────────────────────────────────
  const handleDeleteField = useCallback(
    async (fieldId: string) => {
      if (!formData?.id) return;
      try {
        await deleteFormField(formData.id, fieldId);
        setFormData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            fields: (prev.fields || []).filter((f: FormField) => f.id !== fieldId),
          };
        });
        if (expandedFieldId === fieldId) setExpandedFieldId(null);
        toast.success('Field deleted');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete field');
      }
    },
    [formData?.id, expandedFieldId]
  );

  // ─── Reorder field ────────────────────────────────────────
  const moveField = useCallback(
    (fieldId: string, direction: -1 | 1) => {
      setFormData((prev: any) => {
        if (!prev) return prev;
        const updatedFields = [...(prev.fields || [])];
        const idx = updatedFields.findIndex((f: FormField) => f.id === fieldId);
        if (idx === -1) return prev;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= updatedFields.length) return prev;

        // Swap order values
        const temp = updatedFields[idx].order;
        updatedFields[idx] = { ...updatedFields[idx], order: updatedFields[newIdx].order };
        updatedFields[newIdx] = { ...updatedFields[newIdx], order: temp };

        // Save reorder to API
        Promise.all([
          updateFormField(prev.id, updatedFields[idx].id, { order: updatedFields[idx].order }),
          updateFormField(prev.id, updatedFields[newIdx].id, { order: updatedFields[newIdx].order }),
        ]).catch((err) => toast.error('Failed to reorder fields'));

        return { ...prev, fields: updatedFields };
      });
    },
    []
  );

  // ─── Step management ──────────────────────────────────────
  const handleAddStep = useCallback(() => {
    if (!formData?.id) return;
    const newStep: FormStep = {
      id: crypto.randomUUID(),
      title: `Step ${sortedSteps.length + 1}`,
      description: '',
      order: sortedSteps.length,
    };
    const updatedSteps = [...steps, newStep];
    setFormData((prev: any) => (prev ? { ...prev, steps: updatedSteps } : prev));
    setCurrentStepId(newStep.id);
    debouncedUpdateForm({ steps: updatedSteps });
  }, [formData?.id, steps, sortedSteps.length, debouncedUpdateForm]);

  const handleRemoveStep = useCallback(
    (stepId: string) => {
      if (!formData?.id || sortedSteps.length <= 1) return;
      const remainingSteps = steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i }));
      // Move fields from removed step to the first step
      const targetStepId = remainingSteps[0]?.id;
      const updatedFields = fields.map((f) =>
        f.stepId === stepId ? { ...f, stepId: targetStepId } : f
      );
      setFormData((prev: any) =>
        prev
          ? { ...prev, steps: remainingSteps, fields: updatedFields }
          : prev
      );
      setCurrentStepId(targetStepId || null);
      debouncedUpdateForm({ steps: remainingSteps });

      // Update field stepIds in API
      fields
        .filter((f) => f.stepId === stepId)
        .forEach((f) => {
          if (targetStepId) {
            updateFormField(formData.id, f.id, { stepId: targetStepId }).catch(() => {});
          }
        });
    },
    [formData?.id, steps, sortedSteps.length, fields, debouncedUpdateForm]
  );

  const handleUpdateStep = useCallback(
    (stepId: string, data: Partial<FormStep>) => {
      const updatedSteps = steps.map((s) => (s.id === stepId ? { ...s, ...data } : s));
      setFormData((prev: any) => (prev ? { ...prev, steps: updatedSteps } : prev));
      debouncedUpdateForm({ steps: updatedSteps });
    },
    [steps, debouncedUpdateForm]
  );

  const handleReorderSteps = useCallback(
    (newSteps: FormStep[]) => {
      setFormData((prev: any) => (prev ? { ...prev, steps: newSteps } : prev));
      debouncedUpdateForm({ steps: newSteps });
    },
    [debouncedUpdateForm]
  );

  // ─── Settings changes ────────────────────────────────────
  const handleSettingsChange = useCallback(
    (key: string, value: any) => {
      setFormData((prev: any) => {
        if (!prev) return prev;
        // Handle nested settings
        if (key.startsWith('settings.')) {
          const settingsKey = key.replace('settings.', '');
          return {
            ...prev,
            settings: { ...prev.settings, [settingsKey]: value },
          };
        }
        return { ...prev, [key]: value };
      });
      if (key.startsWith('settings.')) {
        const settingsKey = key.replace('settings.', '');
        debouncedUpdateForm({
          settings: { ...(formData?.settings || {}), [settingsKey]: value },
        });
      } else {
        debouncedUpdateForm({ [key]: value });
      }
    },
    [debouncedUpdateForm, formData?.settings]
  );

  // Cleanup auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, []);

  // ─── Render: Loading state ────────────────────────────────
  if (loadingForms) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <Loader2 size={24} className="animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  // ─── Render: Error state ──────────────────────────────────
  if (formsError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 animate-fade-in gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm text-[var(--muted-foreground)]">{formsError}</p>
        <button
          onClick={loadForms}
          className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Form list item ───────────────────────────────────────
  const formListItems = forms.map((f: any) => {
    const fieldCount = f.fields?.length || f._count?.fields || 0;
    const isSelected = f.id === selectedFormId;
    return (
      <button
        key={f.id}
        onClick={() => setSelectedFormId(f.id)}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
          isSelected
            ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium border border-[var(--primary)]/20'
            : 'text-[var(--foreground)] hover:bg-[var(--accent)] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isSelected ? 'bg-[var(--primary)]/15' : 'bg-[var(--secondary)]'
            }`}
          >
            <FormInput size={13} className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{f.name}</p>
            <p className="text-[10px] text-[var(--muted-foreground)]">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</p>
          </div>
          {f.active !== false && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active" />
          )}
        </div>
      </button>
    );
  });

  // ─── Tab content ──────────────────────────────────────────
  const renderTabContent = () => {
    if (!formData) return null;

    switch (activeTab) {
      case 'fields':
        return (
          <div className="animate-fade-in">
            {/* Step Manager */}
            <StepManager
              steps={steps}
              currentStepId={currentStepId}
              onSelectStep={setCurrentStepId}
              onAddStep={handleAddStep}
              onRemoveStep={handleRemoveStep}
              onUpdateStep={handleUpdateStep}
              onReorder={handleReorderSteps}
              fieldCounts={fieldCounts}
            />

            {/* Fields list */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Fields {currentStepId && `(${currentStepFields.length})`}
                </h4>
              </div>

              {currentStepFields.length === 0 && (
                <div className="text-center py-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)]">
                  <p className="text-sm text-[var(--muted-foreground)]">No fields in this step</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">Add a field using the button below</p>
                </div>
              )}

              {currentStepFields.map((field, idx) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  allFields={sortedFields}
                  index={idx}
                  totalFields={currentStepFields.length}
                  isExpanded={expandedFieldId === field.id}
                  onToggleExpand={() =>
                    setExpandedFieldId((prev) => (prev === field.id ? null : field.id))
                  }
                  onChange={handleFieldChange}
                  onDelete={handleDeleteField}
                  onMoveUp={() => moveField(field.id, -1)}
                  onMoveDown={() => moveField(field.id, 1)}
                />
              ))}
            </div>

            {/* Add field button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFieldPicker((prev) => !prev)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[var(--border)] w-full text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
              >
                <Plus size={16} />
                Add Field
              </button>

              {showFieldPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 z-10 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] p-2 animate-scale-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 max-h-64 overflow-y-auto">
                    {FIELD_TYPE_OPTIONS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleAddField(value)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-lg hover:bg-[var(--accent)] transition-colors text-center"
                      >
                        <FieldTypeIcon type={value} size={18} />
                        <span className="text-[10px] text-[var(--foreground)] leading-tight">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="animate-fade-in">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
                <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">{formData.name}</h3>
                  {formData.settings?.confirmationMessage && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {formData.settings.confirmationMessage}
                    </p>
                  )}
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  Preview Mode
                </span>
              </div>
              <FormPreview form={formData} />
            </div>
          </div>
        );

      case 'embed':
        return <EmbedPanel formId={formData.id} formName={formData.name} />;

      case 'submissions':
        return (
          <div className="animate-fade-in flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 size={48} className="text-[var(--muted-foreground)] mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Submissions & Analytics</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6 max-w-sm">
              View all submissions, track completion rates, analyze source breakdown, and monitor trends for this form.
            </p>
            <button
              onClick={() => { window.location.hash = `/forms/${formData.id}/submissions`; }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BarChart3 size={16} />
              Open Submissions Dashboard
            </button>
          </div>
        );

      case 'settings':
        return (
          <div className="animate-fade-in space-y-6 max-w-2xl">
            {/* Form Name */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Form Name</h4>
              <input
                value={formData.name || ''}
                onChange={(e) => {
                  setFormData((prev: any) => (prev ? { ...prev, name: e.target.value } : prev));
                }}
                onBlur={(e) => handleSettingsChange('name', e.target.value)}
                placeholder="Form name"
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              />
            </div>

            {/* Active Toggle */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Active</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    When active, the form can receive submissions
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.active !== false}
                  onClick={() =>
                    handleSettingsChange('active', formData.active === false ? true : false)
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/20 ${
                    formData.active !== false ? 'bg-emerald-500' : 'bg-[var(--border)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      formData.active !== false ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Form Type */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">Form Type</h4>
              <select
                value={formData.formType || 'custom'}
                onChange={(e) => handleSettingsChange('formType', e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
              >
                {FORM_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Post-Submission Settings */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Post-Submission</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Redirect URL (optional)
                  </label>
                  <input
                    value={formData.settings?.redirectUrl || ''}
                    onChange={(e) => {
                      setFormData((prev: any) =>
                        prev
                          ? {
                              ...prev,
                              settings: { ...prev.settings, redirectUrl: e.target.value },
                            }
                          : prev
                      );
                    }}
                    onBlur={(e) => handleSettingsChange('settings.redirectUrl', e.target.value)}
                    placeholder="https://example.com/thank-you"
                    className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--foreground)] mb-1">
                    Confirmation Message
                  </label>
                  <textarea
                    value={formData.settings?.confirmationMessage || ''}
                    onChange={(e) => {
                      setFormData((prev: any) =>
                        prev
                          ? {
                              ...prev,
                              settings: {
                                ...prev.settings,
                                confirmationMessage: e.target.value,
                              },
                            }
                          : prev
                      );
                    }}
                    onBlur={(e) =>
                      handleSettingsChange('settings.confirmationMessage', e.target.value)
                    }
                    rows={3}
                    placeholder="Thanks! We'll be in touch."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 resize-y"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.settings?.sendConfirmationEmail || false}
                    onChange={(e) => handleSettingsChange('settings.sendConfirmationEmail', e.target.checked)}
                    className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/20"
                  />
                  <div>
                    <span className="text-sm text-[var(--foreground)]">Send confirmation email</span>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Email confirmation to the submitter (requires email field)
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Embed Settings */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Embed Settings</h4>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Theme</label>
                <select
                  value={formData.settings?.embedTheme || 'light'}
                  onChange={(e) => handleSettingsChange('settings.embedTheme', e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Forms</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{forms.length} total forms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── LEFT SIDEBAR ───────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[var(--foreground)]">All Forms</h3>
                <button
                  onClick={() => {
                    setShowNewForm(true);
                    setNewFormName('');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={13} />
                  New
                </button>
              </div>

              {showNewForm && (
                <div className="mt-3 flex gap-2 animate-fade-in">
                  <input
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    placeholder="Form name"
                    autoFocus
                    className="flex-1 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateForm()}
                  />
                  <button
                    onClick={handleCreateForm}
                    disabled={creating || !newFormName.trim()}
                    className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {creating ? <Loader2 size={13} className="animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Form list */}
            <div className="p-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {forms.length === 0 ? (
                <div className="text-center py-8">
                  <FormInput size={28} className="mx-auto text-[var(--muted-foreground)] mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">No forms yet</p>
                  <button
                    onClick={() => {
                      setShowNewForm(true);
                      setNewFormName('');
                    }}
                    className="mt-3 text-xs text-[var(--primary)] hover:underline"
                  >
                    Create your first form
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">{formListItems}</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── MAIN AREA ──────────────────────────────────── */}
        <div className="lg:col-span-9">
          {!selectedFormId ? (
            /* Empty state */
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <FormInput size={44} className="mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">Select a Form</h3>
              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                Choose a form from the sidebar to start editing, or create a new one.
              </p>
              <button
                onClick={() => {
                  setShowNewForm(true);
                  setNewFormName('');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={16} />
                Create New Form
              </button>
            </div>
          ) : loadingForm ? (
            /* Loading form */
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <Loader2 size={28} className="mx-auto animate-spin text-[var(--muted-foreground)] mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">Loading form...</p>
            </div>
          ) : formError ? (
            /* Form error */
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <AlertCircle size={28} className="mx-auto text-red-400 mb-3" />
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{formError}</p>
              <button
                onClick={() => selectedFormId && loadForm(selectedFormId)}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : formData ? (
            /* Form editor */
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden animate-fade-in">
              {/* Form header */}
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      value={formData.name || ''}
                      onChange={(e) => {
                        setFormData((prev: any) =>
                          prev ? { ...prev, name: e.target.value } : prev
                        );
                      }}
                      onBlur={(e) => {
                        if (e.target.value !== formData.name) {
                          handleSettingsChange('name', e.target.value);
                        }
                      }}
                      className="text-lg font-bold text-[var(--foreground)] bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
                    />
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {fields.length} field{fields.length !== 1 ? 's' : ''} &middot;{' '}
                      {sortedSteps.length} step{sortedSteps.length !== 1 ? 's' : ''} &middot;{' '}
                      {formData.formType || 'custom'} form
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        formData.active !== false
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      {formData.active !== false ? (
                        <>
                          <Check size={10} /> Active
                        </>
                      ) : (
                        <>
                          <X size={10} /> Inactive
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--border)] bg-[var(--muted)]/30">
                {([
                  { key: 'fields', label: 'Edit Fields', icon: LayoutDashboard },
                  { key: 'preview', label: 'Preview', icon: Eye },
                  { key: 'embed', label: 'Embed', icon: Code },
                  { key: 'submissions', label: 'Submissions', icon: BarChart3 },
                  { key: 'settings', label: 'Settings', icon: Settings },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === key
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-white'
                        : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/50'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">{renderTabContent()}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
