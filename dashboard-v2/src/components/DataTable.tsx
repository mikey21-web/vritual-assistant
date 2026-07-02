import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  id?: string;
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  actions?: React.ReactNode;
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectRow?: (id: string, checked: boolean) => void;
  rowIdAccessor?: keyof T;
  renderExpandedRow?: (row: T) => React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  id, data, columns, searchPlaceholder = 'Search...', searchValue, onSearchChange,
  isLoading = false, emptyState, actions, selectedIds, onSelectAll, onSelectRow,
  rowIdAccessor, renderExpandedRow,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const hasSelectionField = selectedIds !== undefined && onSelectAll !== undefined && onSelectRow !== undefined && rowIdAccessor !== undefined;

  const [localSearch, setLocalSearch] = useState('');
  const currentSearch = searchValue !== undefined ? searchValue : localSearch;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) { onSearchChange(e.target.value); }
    else { setLocalSearch(e.target.value); setCurrentPage(1); }
  };

  const filteredData = data.filter((row) => {
    if (!currentSearch) return true;
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(currentSearch.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const isAllSelected = hasSelectionField && paginatedData.length > 0 && paginatedData.every(row => selectedIds.has(String(row[rowIdAccessor])));

  return (
    <div id={id || 'data-table-container'} className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={currentSearch}
            onChange={handleSearchChange}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button className="inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--card)] rounded-lg px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-all">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
            Filter
          </button>
        </div>
      </div>

      <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[var(--foreground)]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                {renderExpandedRow && <th className="py-3.5 px-2 w-8 text-center" />}
                {hasSelectionField && (
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input type="checkbox" checked={isAllSelected} onChange={(e) => onSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/30" />
                  </th>
                )}
                {columns.map((col, index) => (
                  <th key={index}
                    className={`py-3.5 px-4 font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wider
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, rIdx) => (
                  <tr key={rIdx} className="border-b border-[var(--border)]">
                    {renderExpandedRow && <td className="py-3.5 px-2"><div className="w-3.5 h-3.5 rounded animate-pulse bg-[var(--muted)] inline-block" /></td>}
                    {hasSelectionField && <td className="py-3.5 px-4"><div className="w-3.5 h-3.5 bg-[var(--muted)] rounded animate-pulse inline-block" /></td>}
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="py-3.5 px-4"><div className="h-3 bg-[var(--muted)] rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={columns.length + (hasSelectionField ? 1 : 0) + (renderExpandedRow ? 1 : 0)} className="py-16">{emptyState}</td></tr>
              ) : (
                paginatedData.map((row, rIdx) => {
                  const rId = hasSelectionField ? String(row[rowIdAccessor]) : String(rIdx);
                  const isSelected = hasSelectionField && selectedIds.has(rId);
                  const isExpanded = renderExpandedRow && expandedRowIds.has(rId);
                  const toggleExpand = () => {
                    setExpandedRowIds((prev) => {
                      const next = new Set(prev);
                      next.has(rId) ? next.delete(rId) : next.add(rId);
                      return next;
                    });
                  };

                  return (
                    <React.Fragment key={`row-${rId}`}>
                      <tr className={`border-b border-[var(--border)] transition-colors duration-150 group ${isSelected ? 'bg-[var(--primary-light)]' : 'hover:bg-[var(--muted)]/50'} ${isExpanded ? 'bg-[var(--muted)]/30' : ''}`}>
                        {renderExpandedRow && (
                          <td className="py-3 px-2 text-center">
                            <button type="button" onClick={toggleExpand}
                              className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer">
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[var(--primary)]' : ''}`} />
                            </button>
                          </td>
                        )}
                        {hasSelectionField && (
                          <td className="py-3 px-4 text-center">
                            <input type="checkbox" checked={isSelected}
                              onChange={(e) => onSelectRow(rId, e.target.checked)}
                              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]/30" />
                          </td>
                        )}
                        {columns.map((col, cIdx) => (
                          <td key={cIdx}
                            className={`py-3 px-4 text-[var(--foreground)] transition-colors
                              ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                              ${col.className || ''}`}>
                            {col.cell ? col.cell(row) : <span className="font-medium">{row[col.accessorKey as string]}</span>}
                          </td>
                        ))}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[var(--muted)]/30 border-b border-[var(--border)]">
                          <td colSpan={columns.length + (hasSelectionField ? 1 : 0) + 1}
                            className="p-0 border-t border-[var(--border)]/40">
                            <div className="p-5">{renderExpandedRow(row)}</div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--muted)]/50 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--muted-foreground)]">
              Showing <span className="font-medium text-[var(--foreground)]">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium text-[var(--foreground)]">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span>{' '}
              of <span className="font-medium text-[var(--foreground)]">{filteredData.length}</span> entries
            </div>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                className="p-1.5 border border-[var(--border)] rounded bg-[var(--card)] text-[var(--muted-foreground)] enabled:hover:bg-[var(--accent)] enabled:hover:text-[var(--foreground)] disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 font-mono text-xs text-[var(--foreground)] whitespace-nowrap">
                {currentPage} <span className="text-[var(--border)]">/</span> {totalPages}
              </div>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                className="p-1.5 border border-[var(--border)] rounded bg-[var(--card)] text-[var(--muted-foreground)] enabled:hover:bg-[var(--accent)] enabled:hover:text-[var(--foreground)] disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
