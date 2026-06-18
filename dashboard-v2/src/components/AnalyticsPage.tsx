/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PageHeader from './PageHeader';
import { Calendar, TrendingUp, Users, Target, ArrowUpRight, BarChart3, PieChart, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');

  // Interactive wave coordinate shifts based on active timeframe
  const getWaveCoordinates = () => {
    switch (timeframe) {
      case '7d':
        return {
          path: "M 0 60 Q 40 10, 80 40 T 160 50 T 240 15 T 320 30 T 400 10 T 480 35 T 560 5 T 640 25 T 720 15 L 720 120 L 0 120 Z",
          strokePath: "M 0 60 Q 40 10, 80 40 T 160 50 T 240 15 T 320 30 T 400 10 T 480 35 T 560 5 T 640 25 T 720 15",
          points: [
            { x: 80, y: 40, val: 140 },
            { x: 240, y: 15, val: 290 },
            { x: 400, y: 10, val: 310 },
            { x: 560, y: 5, val: 340 },
            { x: 720, y: 15, val: 280 }
          ]
        };
      case '90d':
        return {
          path: "M 0 80 Q 40 50, 80 70 T 160 60 T 240 85 T 320 40 T 400 65 T 480 30 T 560 50 T 640 20 T 720 10 L 720 120 L 0 120 Z",
          strokePath: "M 0 80 Q 40 50, 80 70 T 160 60 T 240 85 T 320 40 T 400 65 T 480 30 T 560 50 T 640 20 T 720 10",
          points: [
            { x: 80, y: 70, val: 1100 },
            { x: 240, y: 85, val: 980 },
            { x: 320, y: 40, val: 1450 },
            { x: 480, y: 30, val: 1600 },
            { x: 720, y: 10, val: 1890 }
          ]
        };
      case '30d':
      default:
        return {
          path: "M 0 70 Q 40 30, 80 50 T 160 40 T 240 20 T 320 55 T 400 30 T 480 15 T 560 40 T 640 10 T 720 5 L 720 120 L 0 120 Z",
          strokePath: "M 0 70 Q 40 30, 80 50 T 160 40 T 240 20 T 320 55 T 400 30 T 480 15 T 560 40 T 640 10 T 720 5",
          points: [
            { x: 80, y: 50, val: 420 },
            { x: 240, y: 20, val: 780 },
            { x: 400, y: 30, val: 690 },
            { x: 560, y: 40, val: 510 },
            { x: 720, y: 5, val: 940 }
          ]
        };
    }
  };

  const currentGraph = getWaveCoordinates();

  const handlePointHover = (val: number) => {
    toast(`Metric Node: ${val.toLocaleString()} completions registered`, {
      id: 'metric-hover',
      duration: 1000,
      style: {
        background: '#18181b',
        color: '#fafafa',
        fontSize: '11px',
        border: '1px solid rgba(228, 228, 231, 0.1)',
        fontFamily: 'JetBrains Mono, monospace'
      }
    });
  };

  return (
    <div id="analytics-page-root" className="space-y-6">
      <PageHeader
        title="Enterprise Data Analytics"
        description="Extract performance matrices, multi-channel pipelines statistics, conversion funnels, and origin ratios in real-time."
        category="Platform Intel"
        actions={
          <div className="flex border border-gray-200 bg-white rounded-lg p-0.5 shadow-[var(--shadow-subtle)] select-none">
            {(['7d', '30d', '90d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTimeframe(t);
                  toast.success(`Shifted analytics view scope: last ${t}`, {
                    id: 'tf-toast',
                    style: {
                      background: '#09090b',
                      color: '#f4f4f5',
                      fontSize: '13px',
                      border: '1px solid rgba(228, 228, 231, 0.15)',
                    }
                  });
                }}
                className={`px-3 py-1 text-[11px] font-mono font-semibold rounded-md transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-zinc-950 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      {/* Overview Bento Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold block">Customer Acquisition Cost</span>
              <h3 className="font-mono text-2xl font-semibold text-gray-950 tracking-tight">$34.12</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              -12% CAC
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed pt-4">
            Spend efficiency scoring is optimal based on organic search triggers offsetting spend.
          </p>
        </div>

        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold block">Total Aggregated Clicks</span>
              <h3 className="font-mono text-2xl font-semibold text-gray-950 tracking-tight">41,894</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              ▲ 18.5%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed pt-4">
            Unified LinkedIn text-inmail click metrics saw a significant spike over the last week.
          </p>
        </div>

        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold block">Return on Ads Spend (ROAS)</span>
              <h3 className="font-mono text-2xl font-semibold text-gray-950 tracking-tight">4.18x</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              ▲ 8.4%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 font-sans leading-relaxed pt-4">
            Enterprise target conversions are averaging $12k base deals, elevating ROAS indexes.
          </p>
        </div>
      </div>

      {/* Main Dynamic chart pane */}
      <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-950 font-display text-sm flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Automated Completions Workflow Trend
            </h3>
            <p className="text-xs text-gray-400">Chronological ingestion triggers matching active router criteria.</p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
              Router Executions
            </span>
            <span>Scale: Integrations Complete</span>
          </div>
        </div>

        {/* Handcrafted precise responsive SVG chart */}
        <div className="w-full h-44 relative bg-gray-50/40 rounded-lg p-2 overflow-hidden border border-gray-100">
          
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-x-0 top-0 h-px bg-gray-100/80" />
          <div className="absolute inset-x-0 top-1/4 h-px bg-gray-100/80" />
          <div className="absolute inset-x-0 top-2/4 h-px bg-gray-100/80" />
          <div className="absolute inset-x-0 top-3/4 h-px bg-gray-100/80" />

          <svg className="w-full h-full overflow-visible" viewBox="0 0 720 120" preserveAspectRatio="none">
            {/* Color gradient under the wave */}
            <defs>
              <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Area block */}
            <path
              d={currentGraph.path}
              fill="url(#chart-area-grad)"
              className="transition-all duration-700 ease-in-out"
            />

            {/* Stroke path */}
            <path
              d={currentGraph.strokePath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-700 ease-in-out"
            />

            {/* Responsive grid coordinates dots */}
            {currentGraph.points.map((pt, i) => (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2"
                  className="cursor-pointer hover:r-6 transition-all"
                  onClick={() => handlePointHover(pt.val)}
                />
              </g>
            ))}
          </svg>
        </div>

        {/* Axis Labels */}
        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-3 px-2 select-none">
          <span>T-Minus Phase</span>
          <span>Initiation Influx</span>
          <span>Routing Node Peak</span>
          <span>Staged Buffers Sync</span>
          <span>Terminus Term</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Ingestion Distribution Channels */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 space-y-4">
          <h3 className="font-semibold text-gray-950 font-display text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Lead Acquisition channels ratio
          </h3>

          <div className="space-y-4">
            {[
              { source: 'LinkedIn Ads & Outreach', value: 38, count: 1420, color: 'bg-zinc-900' },
              { source: 'Google Ads (Paid Search)', value: 29, count: 890, color: 'bg-zinc-700' },
              { source: 'Organic search (SaaS Hub)', value: 18, count: 540, color: 'bg-zinc-500' },
              { source: 'Cold Outreach Direct', value: 10, count: 220, color: 'bg-zinc-400' },
              { source: 'Meta & Instagram Ads', value: 5, count: 98, color: 'bg-zinc-300' }
            ].map((col, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-800">{col.source}</span>
                  <span className="font-mono text-gray-400">{col.count} Leads ({col.value}%)</span>
                </div>
                <div className="w-full bg-gray-50 border border-gray-100 rounded-full h-2.5 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full ${col.color}`}
                    style={{ width: `${col.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-5 space-y-4">
          <h3 className="font-semibold text-gray-950 font-display text-sm flex items-center gap-1.5 border-b border-gray-100 pb-3">
            <Target className="w-4 h-4 text-indigo-600" />
            Lead Influx Conversion Funnel
          </h3>

          <div className="flex flex-col gap-2 pt-2">
            {[
              { stage: '1. Ingested Webhooks', pct: 100, count: '3,180 Raw' },
              { stage: '2. Scored & Verified', pct: 74, count: '2,353 Verified' },
              { stage: '3. Contacted / Demo Set', pct: 45, count: '1,431 Scheduled' },
              { stage: '4. Closed-Won Enterprise', pct: 18, count: '572 Accounts' }
            ].map((phase, idx) => (
              <div
                key={idx}
                className="relative border border-gray-100 p-3 rounded-lg flex items-center justify-between overflow-hidden group hover:border-gray-200 transition-colors bg-gray-50/20"
              >
                {/* Horizontal dynamic color backing showing funnel reduction */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-blue-600/5 pointer-events-none group-hover:bg-blue-600/10 transition-colors"
                  style={{ width: `${phase.pct}%` }}
                />

                <div className="relative font-semibold text-gray-900 text-[12px]">
                  {phase.stage}
                </div>
                <div className="relative flex items-center gap-3">
                  <span className="text-[11px] font-mono text-gray-400">{phase.count}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-zinc-900 text-zinc-100 text-[9px] font-mono font-bold rounded">
                    {phase.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed font-sans mt-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Your standard ingestion-to-close metrics exceed average platform benchmarks by <b>+4.2%</b>, driven by instant sub-second SMS routing.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
