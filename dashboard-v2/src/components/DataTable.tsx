/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  id,
  data,
  columns,
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  isLoading = false,
  emptyState,
  actions,
  selectedIds,
  onSelectAll,
  onSelectRow,
  rowIdAccessor,
  renderExpandedRow,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  
  const hasSelectionField = selectedIds !== undefined && onSelectAll !== undefined && onSelectRow !== undefined && rowIdAccessor !== undefined;

  // Local filtering if no external handler is provided
  const [localSearch, setLocalSearch] = useState('');
  const currentSearch = searchValue !== undefined ? searchValue : localSearch;
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    } else {
      setLocalSearch(e.target.value);
      setCurrentPage(1);
    }
  };

  const filteredData = data.filter((row) => {
    if (!currentSearch) return true;
    return Object.values(row).some((val) => {
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(currentSearch.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isAllSelected = 
    hasSelectionField && 
    paginatedData.length > 0 && 
    paginatedData.every(row => selectedIds.has(String(row[rowIdAccessor])));

  return (
    <div id={id || 'data-table-container'} className="w-full space-y-4">
      {/* Tool bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pb-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={currentSearch}
            onChange={handleSearchChange}
            className="w-full bg-white border border-gray-200/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 font-sans focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 shadow-[var(--shadow-subtle)]"
          />
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <button className="flex items-center gap-1.5 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:ring-1 focus:ring-gray-200 transition-colors shadow-[var(--shadow-subtle)]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            Filter
          </button>
        </div>
      </div>

      {/* Main Table Layer */}
      <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs text-gray-600">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 select-none">
                {renderExpandedRow && (
                  <th className="py-3 px-2 w-8 text-center" />
                )}
                {hasSelectionField && (
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                    />
                  </th>
                )}
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`py-3 px-4 font-semibold text-gray-500 font-mono text-[10px] uppercase tracking-wider ${
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                    } ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, rIdx) => (
                  <tr key={rIdx} className="border-b border-gray-100">
                    {renderExpandedRow && (
                      <td className="py-3.5 px-2 text-center">
                        <div className="w-3.5 h-3.5 rounded animate-pulse bg-gray-100 inline-block" />
                      </td>
                    )}
                    {hasSelectionField && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="w-3.5 h-3.5 bg-gray-100 rounded animate-pulse inline-block" />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="py-3.5 px-4">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (hasSelectionField ? 1 : 0) + (renderExpandedRow ? 1 : 0)} className="py-12">
                    {emptyState}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => {
                  const rId = hasSelectionField ? String(row[rowIdAccessor]) : String(rIdx);
                  const isSelected = hasSelectionField && selectedIds.has(rId);
                  const isExpanded = renderExpandedRow && expandedRowIds.has(rId);

                  const toggleExpand = () => {
                    setExpandedRowIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(rId)) {
                        next.delete(rId);
                      } else {
                        next.add(rId);
                      }
                      return next;
                    });
                  };

                  return (
                    <React.Fragment key={`expanded-row-wrapper-${rId}`}>
                      <tr
                        className={`border-b border-gray-100 transition-colors duration-150 group ${
                          isSelected ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'
                        } ${isExpanded ? 'bg-blue-50/[0.02]' : ''}`}
                      >
                        {renderExpandedRow && (
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand();
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-100 cursor-pointer transition-colors"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600 font-bold' : ''}`} />
                            </button>
                          </td>
                        )}
                        {hasSelectionField && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onSelectRow(rId, e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/30"
                            />
                          </td>
                        )}
                        {columns.map((col, cIdx) => {
                          const cellVal = row[col.accessorKey as string];
                          return (
                            <td
                              key={cIdx}
                              className={`py-2.5 px-4 text-gray-700 transition-colors ${
                                col.align === 'center'
                                  ? 'text-center'
                                  : col.align === 'right'
                                    ? 'text-right'
                                    : 'text-left'
                              } ${col.className || ''}`}
                            >
                              {col.cell ? (
                                col.cell(row)
                              ) : (
                                <span className="font-medium text-gray-900">{cellVal}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50/40 border-b border-gray-100">
                          <td
                            colSpan={columns.length + (hasSelectionField ? 1 : 0) + (renderExpandedRow ? 1 : 0)}
                            className="p-0 border-t border-gray-100/40"
                          >
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
        
        {/* Pagination bar */}
        {!isLoading && filteredData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-t border-gray-100 select-none">
            <div className="text-xs text-gray-500">
              Showing <span className="font-medium text-gray-950">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium text-gray-950">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>{' '}
              of <span className="font-medium text-gray-950">{filteredData.length}</span> entries
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                className="p-1 border border-gray-200/80 rounded bg-white text-gray-500 enabled:hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              
              <div className="px-2 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                {currentPage} <span className="text-gray-300">/</span> {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                className="p-1 border border-gray-200/80 rounded bg-white text-gray-500 enabled:hover:bg-gray-50 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
