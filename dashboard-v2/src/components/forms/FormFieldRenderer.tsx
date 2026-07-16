import { useRef } from 'react';
import {
  Mail,
  Phone,
  Hash,
  AlignLeft,
  ChevronDown,
  Calendar,
  Clock,
  Upload,
  Type,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConditionalLogic {
  action: 'show' | 'hide' | 'require';
  conditions: Array<{
    fieldKey: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'contains';
    value: unknown;
  }>;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldConfig {
  id: string;
  fieldKey: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'number'
    | 'textarea'
    | 'select'
    | 'multi-select'
    | 'checkbox'
    | 'radio'
    | 'date'
    | 'datetime'
    | 'file'
    | 'heading'
    | 'paragraph';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: FormFieldOption[];
  conditionalLogic?: ConditionalLogic;
  step?: number;
  order?: number;
}

export interface FormFieldRendererProps {
  field: FormFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  errors?: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputBaseClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50';

const inputErrorClass =
  'border-red-400 focus:border-red-500 focus:ring-red-500/20';

// ─── Component ───────────────────────────────────────────────────────────────

export default function FormFieldRenderer({
  field,
  value,
  onChange,
  errors = {},
}: FormFieldRendererProps) {
  const error = errors[field.fieldKey];
  const inputId = `field-${field.fieldKey}`;
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Display-only types ─────────────────────────────────────────────────

  if (field.type === 'heading') {
    return (
      <div className="mb-2">
        <h3 className="text-xl font-bold text-gray-900">{field.label}</h3>
        {field.description && (
          <p className="mt-1 text-sm text-gray-500">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div className="mb-2">
        <p className="text-sm text-gray-600 leading-relaxed">{field.label}</p>
        {field.description && (
          <p className="mt-1 text-sm text-gray-400">{field.description}</p>
        )}
      </div>
    );
  }

  // ── Label ──────────────────────────────────────────────────────────────

  const showLabel =
    field.type !== 'checkbox' && field.type !== 'radio' && field.type !== 'multi-select';

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-900"
        >
          {field.label}
          {field.required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}

      {/* ── Text ──────────────────────────────────────────────────────── */}
      {field.type === 'text' && (
        <div className="relative">
          <Type
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Email ─────────────────────────────────────────────────────── */}
      {field.type === 'email' && (
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="email"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'you@example.com'}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Phone ─────────────────────────────────────────────────────── */}
      {field.type === 'phone' && (
        <div className="relative">
          <Phone
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="tel"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '+1 (555) 000-0000'}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Number ────────────────────────────────────────────────────── */}
      {field.type === 'number' && (
        <div className="relative">
          <Hash
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="number"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Textarea ──────────────────────────────────────────────────── */}
      {field.type === 'textarea' && (
        <div className="relative">
          <AlignLeft
            size={16}
            className="absolute left-3 top-3 text-gray-400 pointer-events-none"
          />
          <textarea
            id={inputId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`${inputBaseClass} pl-10 resize-y min-h-[100px] ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Select ────────────────────────────────────────────────────── */}
      {field.type === 'select' && (
        <div className="relative">
          <select
            id={inputId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBaseClass} appearance-none pr-10 ${error ? inputErrorClass : ''}`}
          >
            <option value="">
              {field.placeholder || 'Select an option...'}
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      )}

      {/* ── Multi-select (checkbox group) ─────────────────────────────── */}
      {field.type === 'multi-select' && (
        <fieldset>
          <legend className="sr-only">{field.label}</legend>
          <div className="space-y-2 mt-1">
            {(field.options ?? []).map((opt) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const checked = arr.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? arr.filter((v) => v !== opt.value)
                        : [...arr, opt.value];
                      onChange(next);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {opt.label}
                  </span>
                </label>
              );
            })}
            {(field.options ?? []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No options</p>
            )}
          </div>
        </fieldset>
      )}

      {/* ── Checkbox (single toggle) ──────────────────────────────────── */}
      {field.type === 'checkbox' && (
        <label className="flex items-center gap-3 cursor-pointer group py-1">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
          />
          <div>
            <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
              {field.label}
            </span>
            {field.required && (
              <span className="ml-1 text-red-500" aria-hidden="true">
                *
              </span>
            )}
            {field.description && (
              <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
            )}
          </div>
        </label>
      )}

      {/* ── Radio group ───────────────────────────────────────────────── */}
      {field.type === 'radio' && (
        <fieldset>
          <legend className="sr-only">{field.label}</legend>
          <div className="space-y-2 mt-1">
            {(field.options ?? []).map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name={inputId}
                  checked={(value as string) === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500/20"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {opt.label}
                </span>
              </label>
            ))}
            {(field.options ?? []).length === 0 && (
              <p className="text-sm text-gray-400 italic">No options</p>
            )}
          </div>
        </fieldset>
      )}

      {/* ── Date ──────────────────────────────────────────────────────── */}
      {field.type === 'date' && (
        <div className="relative">
          <Calendar
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── Datetime ──────────────────────────────────────────────────── */}
      {field.type === 'datetime' && (
        <div className="relative">
          <Clock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            id={inputId}
            type="datetime-local"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputBaseClass} pl-10 ${error ? inputErrorClass : ''}`}
          />
        </div>
      )}

      {/* ── File ──────────────────────────────────────────────────────── */}
      {field.type === 'file' && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`${inputBaseClass} flex items-center gap-2 cursor-pointer hover:border-gray-400 transition-colors ${
              error ? inputErrorClass : ''
            }`}
          >
            <Upload size={16} className="text-gray-400" />
            <span className={value ? 'text-gray-900' : 'text-gray-400'}>
              {value
                ? (value as { name?: string }).name || 'File selected'
                : field.placeholder || 'Click to upload a file'}
            </span>
          </button>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              onChange(
                file
                  ? { name: file.name, size: file.size, type: file.type }
                  : null
              );
            }}
          />
        </div>
      )}

      {/* ── Error message ─────────────────────────────────────────────── */}
      {error && (
        <p className="text-xs text-red-500 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
