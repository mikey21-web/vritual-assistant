import * as React from "react";

const badgeVariants = {
  default: "border-transparent bg-[var(--primary-light)] text-[var(--primary)]",
  secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  outline: "text-[var(--foreground)]",
  success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

export const Badge = ({ className = "", variant = "default", ...props }: BadgeProps) => (
  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${badgeVariants[variant]} ${className}`} {...props} />
);
