import * as React from "react";

export const Skeleton = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`animate-pulse rounded-md bg-[var(--muted)] ${className}`} {...props} />
);
