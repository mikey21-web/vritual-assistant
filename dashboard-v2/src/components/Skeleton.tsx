/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SkeletonProps {
  id?: string;
  type: 'table' | 'cards' | 'form' | 'stats';
  count?: number;
}

export default function Skeleton({ id, type, count = 3 }: SkeletonProps) {
  const containerId = id || `skeleton-${type}`;

  if (type === 'stats') {
    return (
      <div id={containerId} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full select-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-100 bg-white rounded-xl p-5 shadow-[var(--shadow-premium)] space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-2.5 bg-gray-200 rounded w-16" />
              <div className="h-6 w-16 bg-gray-100 rounded" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div id={containerId} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full select-none">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border border-gray-100 bg-white rounded-xl p-5 shadow-[var(--shadow-premium)] space-y-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-5 w-12 bg-gray-200 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'form') {
    return (
      <div id={containerId} className="border border-gray-100 bg-white rounded-xl p-6 shadow-[var(--shadow-premium)] max-w-2xl mx-auto space-y-6 animate-pulse select-none">
        <div className="space-y-2 pb-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-100 rounded w-full" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-100 rounded w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-100 rounded w-full" />
          </div>

          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-20 bg-gray-100 rounded w-full" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <div className="h-8 bg-gray-100 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded w-28" />
        </div>
      </div>
    );
  }

  // Default block: table
  return (
    <div id={containerId} className="border border-gray-100 bg-white rounded-xl shadow-[var(--shadow-premium)] overflow-hidden space-y-4 p-4 animate-pulse select-none">
      <div className="flex items-center justify-between pb-4 border-b border-gray-50">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-6 bg-gray-200 rounded w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5">
            <div className="h-3.5 bg-gray-100 rounded w-1/4" />
            <div className="h-3.5 bg-gray-100 rounded w-1/6" />
            <div className="h-3.5 bg-gray-100 rounded w-1/12" />
            <div className="h-3.5 bg-gray-100 rounded w-1/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
