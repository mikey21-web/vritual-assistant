/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  isHero?: boolean;
  sparklineData?: number[]; // [0, 10, 5, 20, 15, ...]
}

export default function StatCard({
  id,
  title,
  value,
  change,
  changeDirection = 'neutral',
  timeframe = 'vs last week',
  isHero = false,
  sparklineData,
}: StatCardProps) {
  // Generate SVG path for a high-fidelity inline sparkline
  const generateSparklinePath = (data: number[]) => {
    if (!data || data.length < 2) return '';
    const width = 80;
    const height = 24;
    const padding = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    
    return data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / range) * (height - padding * 2) - padding;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const trendColor = 
    changeDirection === 'up' 
      ? 'text-emerald-600' 
      : changeDirection === 'down' 
        ? 'text-rose-600' 
        : 'text-gray-500';

  return (
    <div
      id={id || `stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative rounded-xl border border-gray-200/50 bg-white p-5 shadow-[var(--shadow-premium)] transition-all ${
        isHero 
          ? 'col-span-full md:col-span-2 lg:col-span-3 p-6 border-b-2 border-b-blue-600/30'
          : 'col-span-1'
      }`}
    >
      {/* Subtle top inner light mask for high-end feel */}
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-gray-100 to-transparent pointer-events-none" />

      <div className="flex items-start justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
          {title}
        </span>
        {sparklineData && sparklineData.length > 0 && (
          <div className="shrink-0 pt-0.5 ml-4">
            <svg width="80" height="24" className="overflow-visible">
              <path
                d={generateSparklinePath(sparklineData)}
                fill="none"
                stroke={changeDirection === 'up' ? '#059669' : changeDirection === 'down' ? '#e11d48' : '#6b7280'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-x-2">
        <span className={`font-mono tracking-tight font-medium text-gray-950 ${
          isHero ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
        }`}>
          {value}
        </span>
        
        {change && (
          <div className="flex items-center gap-1 text-[13px]">
            <span className={`font-medium ${trendColor}`}>
              {changeDirection === 'up' && '▲'}
              {changeDirection === 'down' && '▼'}
              {changeDirection === 'neutral' && '•'}
              {change}
            </span>
            <span className="text-gray-400 text-xs font-sans font-normal">
              {timeframe}
            </span>
          </div>
        )}
      </div>

      {isHero && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Real-time feed streaming
          </span>
          <span className="font-mono text-[10px]">L AUTO ENG v2.4</span>
        </div>
      )}
    </div>
  );
}
