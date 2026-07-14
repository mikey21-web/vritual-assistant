import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", label, error, id, children, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`flex h-10 w-full appearance-none rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2 pr-9 text-sm text-[var(--foreground)] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500 focus:ring-red-500/20" : ""} ${className}`}
            {...props}
          >
            {children}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        </div>
        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
