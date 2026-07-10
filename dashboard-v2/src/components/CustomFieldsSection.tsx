import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface FieldDefinition {
  id: string;
  name: string;
  key: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN' | 'MULTI_SELECT';
  options: string[];
  required: boolean;
  active: boolean;
  displayOrder: number;
}

interface FieldValue {
  id: string;
  definitionId: string;
  value: string | null;
  definition: FieldDefinition;
}

interface Props {
  target: 'LEAD' | 'CONTACT' | 'TICKET';
  targetId: string;
}

export default function CustomFieldsSection({ target, targetId }: Props) {
  const [definitions, setDefinitions] = useState<FieldDefinition[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const valuesTarget = target.toLowerCase();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [defsRes, valsRes] = await Promise.all([
          api(`/custom-fields/definitions?target=${target}`),
          api(`/custom-fields/values/${valuesTarget}/${targetId}`),
        ]);
        if (cancelled) return;
        const defs: FieldDefinition[] = (defsRes.data || []).filter((d: FieldDefinition) => d.active);
        setDefinitions(defs);
        const valMap: Record<string, string> = {};
        for (const v of (valsRes || []) as FieldValue[]) {
          valMap[v.definitionId] = v.value ?? '';
        }
        setValues(valMap);
      } catch {
        /* no custom fields configured, or fetch failed silently */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [target, targetId]);

  const saveValue = async (definitionId: string, value: string) => {
    setValues(prev => ({ ...prev, [definitionId]: value }));
    setSaving(definitionId);
    try {
      await api(`/custom-fields/values/${valuesTarget}/${targetId}`, {
        method: 'POST',
        body: JSON.stringify({ values: [{ definitionId, value }] }),
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save field');
    }
    setSaving(null);
  };

  if (loading) return null;
  if (definitions.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Custom Fields</h4>
      <div className="space-y-2.5 text-sm">
        {definitions.map(def => {
          const value = values[def.id] ?? '';
          const isSaving = saving === def.id;
          return (
            <div key={def.id} className="flex items-center gap-2">
              <span className="text-[var(--foreground)] font-medium min-w-[120px]">{def.name}{def.required ? ' *' : ''}:</span>
              {def.type === 'BOOLEAN' ? (
                <input
                  type="checkbox"
                  checked={value === 'true'}
                  onChange={e => saveValue(def.id, String(e.target.checked))}
                  className="h-4 w-4"
                />
              ) : def.type === 'DROPDOWN' ? (
                <select
                  value={value}
                  onChange={e => saveValue(def.id, e.target.value)}
                  className="flex-1 h-8 rounded border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--foreground)]"
                >
                  <option value="">-</option>
                  {(def.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : def.type === 'MULTI_SELECT' ? (
                <div className="flex-1 flex flex-wrap gap-1">
                  {(def.options || []).map(o => {
                    const selected = value.split(',').filter(Boolean);
                    const isOn = selected.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => {
                          const next = isOn ? selected.filter(s => s !== o) : [...selected, o];
                          saveValue(def.id, next.join(','));
                        }}
                        className={`px-2 py-0.5 rounded text-xs border transition-colors ${isOn ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type={def.type === 'NUMBER' ? 'number' : def.type === 'DATE' ? 'date' : 'text'}
                  value={value}
                  onChange={e => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                  onBlur={e => saveValue(def.id, e.target.value)}
                  className="flex-1 h-8 rounded border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--foreground)]"
                />
              )}
              {isSaving && <span className="text-[10px] text-[var(--muted-foreground)]">saving...</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
