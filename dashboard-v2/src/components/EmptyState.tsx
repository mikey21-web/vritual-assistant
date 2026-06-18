/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EmptyStateProps {
  id?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: 'search' | 'database' | 'campaign' | 'analytics';
}

export default function EmptyState({
  id,
  title,
  description,
  actionLabel,
  onAction,
  icon = 'database'
}: EmptyStateProps) {
  // Beautiful monochrome SVGs
  const renderIconSvg = () => {
    switch (icon) {
      case 'search':
        return (
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'campaign':
        return (
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      case 'analytics':
        return (
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        );
      case 'database':
      default:
        return (
          <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        );
    }
  };

  return (
    <div id={id || `empty-state-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-center py-8 px-4 max-w-sm mx-auto select-none">
      <div className="mb-4">
        {renderIconSvg()}
      </div>
      <h3 className="text-sm font-semibold text-gray-950 font-display">
        {title}
      </h3>
      <p className="text-[13px] text-gray-400 mt-1 mb-5 leading-relaxed font-sans font-normal">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg px-4 py-2 transition-colors cursor-pointer shadow-[var(--shadow-subtle)] focus:ring-2 focus:ring-blue-500/10"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
