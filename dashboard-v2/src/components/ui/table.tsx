import * as React from "react";

export const Table = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
    <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

export const TableHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`bg-[var(--muted)] [&_tr]:border-b [&_tr]:border-[var(--border)] ${className}`} {...props} />
);

export const TableBody = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

export const TableRow = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 ${className}`} {...props} />
);

export const TableHead = ({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`h-10 px-4 text-left align-middle text-xs font-semibold text-[var(--muted-foreground)] [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

export const TableCell = ({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);
