import * as React from "react";

const badgeVariants = {
  default: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
  secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  destructive: "border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)]",
  outline: "text-[var(--foreground)]",
  success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
  warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${badgeVariants[variant]} ${className}`} {...props} />
);
