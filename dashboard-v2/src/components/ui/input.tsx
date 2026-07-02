import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500 focus:ring-red-500/20" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
