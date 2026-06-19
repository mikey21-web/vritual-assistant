import * as React from "react";

export const Table = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
  </div>
);

export const TableHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`border-b border-[var(--border)] [&_tr]:border-b-0 ${className}`} {...props} />
);

export const TableBody = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

export const TableRow = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50 data-[state=selected]:bg-[var(--muted)] ${className}`} {...props} />
);

export const TableHead = ({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`h-10 px-4 text-left align-middle font-medium text-[var(--muted-foreground)] [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);

export const TableCell = ({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`} {...props} />
);
