/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface PageHeaderProps {
  id?: string;
  title: string;
  description: string;
  category?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ id, title, description, category, actions }: PageHeaderProps) {
  return (
    <div id={id || `header-${title.toLowerCase().replace(/\s+/g, '-')}`} className="flex flex-col md:flex-row md:items-end md:justify-between pb-6 border-b border-gray-200/60 mb-6 gap-4">
      <div className="flex-1 space-y-1">
        {category && (
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-gray-400 font-semibold block">
            {category}
          </span>
        )}
        <h1 className="text-2xl font-semibold font-display tracking-tight text-gray-950 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-[13px] text-gray-500 leading-relaxed font-sans max-w-2xl">
          {description}
        </p>
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
