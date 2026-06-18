/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  GitFork, Users, Trash2, Plus, Sparkles, Check, 
  HelpCircle, AlertCircle, Play, CheckCircle
} from 'lucide-react';
import { RoutingRule } from '../types';
import toast from 'react-hot-toast';

interface LeadRoutingRulesProps {
  id?: string;
  rules: RoutingRule[];
  onChangeRules: (rules: RoutingRule[]) => void;
}

// Pre-defined available team members for clean routing destinations
const TEAM_ROSTER = [
  'Alex Rivera',
  'Sophia Martinez',
  'Marcus Chen',
  'Jordan Taylor',
  'Emma Watson'
];

// Pre-defined lead sources
const SOURCES = [
  'Google Ads',
  'Meta',
  'Organic Search',
  'Referral',
  'LinkedIn',
  'Cold Outreach',
  'API Gateway'
];

export default function LeadRoutingRules({
  rules = [],
  onChangeRules
}: LeadRoutingRulesProps) {
  // Local state for New Rule form
  const [name, setName] = useState('');
  const [criterion, setCriterion] = useState<'source' | 'score'>('source');
  const [operator, setOperator] = useState<'equals' | 'greater_than' | 'less_than'>('equals');
  const [sourceValue, setSourceValue] = useState('LinkedIn');
  const [scoreValue, setScoreValue] = useState('80');
  const [assignee, setAssignee] = useState(TEAM_ROSTER[0]);
  const [isAdding, setIsAdding] = useState(false);

  // Simulation State
  const [simSource, setSimSource] = useState('LinkedIn');
  const [simScore, setSimScore] = useState(85);
  const [simResult, setSimResult] = useState<{
    matchedRule: RoutingRule | null;
    assignedTo: string;
    log: string;
  } | null>(null);

  // Handle active status toggle
  const handleToggleActive = (ruleId: string) => {
    const updated = rules.map((r) => {
      if (r.id === ruleId) {
        const nextState = !r.isActive;
        toast.success(`Rule "${r.name}" is now ${nextState ? 'ACTIVE' : 'INACTIVE'}`, {
          style: {
            background: '#09090b',
            color: '#f4f4f5',
            fontSize: '12px'
          }
        });
        return { ...r, isActive: nextState };
      }
      return r;
    });
    onChangeRules(updated);
  };

  // Handle rule delete
  const handleDeleteRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    const updated = rules.filter((r) => r.id !== ruleId);
    onChangeRules(updated);
    toast.success(`Deleted routing rule "${rule.name}" successfully.`);
  };

  // Handle new rule submit
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a descriptive name for this rule.');
      return;
    }

    const valueStr = criterion === 'source' ? sourceValue : scoreValue;
    if (criterion === 'score') {
      const scoreNum = Number(scoreValue);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        toast.error('Please enter a valid quality score (0 to 100).');
        return;
      }
    }

    const newRule: RoutingRule = {
      id: `RR-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      criterion,
      operator: criterion === 'source' ? 'equals' : operator,
      value: valueStr,
      assignee,
      isActive: true
    };

    onChangeRules([...rules, newRule]);
    setName('');
    setIsAdding(false);
    toast.success(`New dispatch rule "${newRule.name}" appended successfully!`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '12px'
      }
    });
  };

  // Run dynamic Lead Routing Rules Matcher Simulation
  const handleRunSimulation = () => {
    toast.loading('Initializing routing simulation logs...', { id: 'sim', duration: 800 });

    setTimeout(() => {
      // Find the first active rule that matches
      let matched: RoutingRule | null = null;
      let reason = '';

      for (const rule of rules) {
        if (!rule.isActive) continue;

        if (rule.criterion === 'source') {
          if (simSource.toLowerCase() === rule.value.toLowerCase()) {
            matched = rule;
            reason = `Lead source "${simSource}" matches Rule: "${rule.name}" (criterion: source equals LinkedIn/Ads)`;
            break;
          }
        } else if (rule.criterion === 'score') {
          const limitValue = Number(rule.value);
          if (rule.operator === 'greater_than') {
            if (simScore > limitValue) {
              matched = rule;
              reason = `Lead quality score ${simScore} is greater than trigger threshold of ${limitValue}`;
              break;
            }
          } else if (rule.operator === 'less_than') {
            if (simScore < limitValue) {
              matched = rule;
              reason = `Lead quality score ${simScore} is less than trigger threshold of ${limitValue}`;
              break;
            }
          } else if (rule.operator === 'equals') {
            if (simScore === limitValue) {
              matched = rule;
              reason = `Lead quality score ${simScore} exactly equals trigger threshold of ${limitValue}`;
              break;
            }
          }
        }
      }

      if (matched) {
        setSimResult({
          matchedRule: matched,
          assignedTo: matched.assignee,
          log: `[MATCHED SUCCESS] ${reason}. Lead automatically assigned to ${matched.assignee}.`
        });
        toast.success(`Lead routed to ${matched.assignee}!`, { id: 'sim' });
      } else {
        setSimResult({
          matchedRule: null,
          assignedTo: 'Standard Round-Robin Queue',
          log: '[FALLBACK TRIGGERED] No active custom rules matched this criteria. Routed automatically to fallback group: "Standard Round-Robin Queue".'
        });
        toast.success('Fallback routing logic executed.', { id: 'sim' });
      }
    }, 800);
  };

  return (
    <div className="border border-gray-200/50 bg-white rounded-xl shadow-[var(--shadow-premium)] p-6 space-y-5">
      
      {/* Panel Header */}
      <div className="border-b border-gray-100 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-950 font-display text-sm flex items-center gap-1.5 uppercase font-mono tracking-wide">
            <GitFork className="w-4 h-4 text-blue-600" />
            Automated Lead Routing Rules
          </h3>
          <p className="text-[11px] text-gray-400">Define priorities to assign incoming leads instantly to team members based on source or quality score.</p>
        </div>
        
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? 'Close Rule Form' : 'Create New Rule'}
        </button>
      </div>

      {/* Adding Rule Accordion Form */}
      {isAdding && (
        <form onSubmit={handleCreateRule} className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 space-y-4 animate-fade-in text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-gray-700 block text-[11px]">Rule Description / Label</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., LinkedIn Enterprise AE Escalation"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-950 font-medium focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block text-[11px]">If Lead Property Is</label>
              <select
                value={criterion}
                onChange={(e) => {
                  const val = e.target.value as 'source' | 'score';
                  setCriterion(val);
                  if (val === 'source') {
                    setOperator('equals');
                  } else {
                    setOperator('greater_than');
                  }
                }}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-950 font-semibold focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="source">Source (Marketing Channel)</option>
                <option value="score">Scoring Points (Calculated)</option>
              </select>
            </div>

            {/* Operator Column (Hidden/locked if Source because source matcher must be 'equals') */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block text-[11px]">Operator</label>
              {criterion === 'source' ? (
                <div className="w-full bg-gray-100/70 border border-gray-200 text-gray-400 rounded-lg px-3 py-2 font-mono font-bold select-none cursor-not-allowed">
                  = Equals (String Match)
                </div>
              ) : (
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-950 font-semibold focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono"
                >
                  <option value="greater_than">&gt; Greater Than</option>
                  <option value="less_than">&lt; Less Than</option>
                  <option value="equals">= Exactly Equals</option>
                </select>
              )}
            </div>

            {/* Matching Comparison Value */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block text-[11px]">Comparison Value</label>
              {criterion === 'source' ? (
                <select
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-950 font-semibold focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono"
                >
                  {SOURCES.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreValue}
                    onChange={(e) => setScoreValue(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-gray-950 font-semibold focus:ring-1 focus:ring-blue-500/20 font-mono"
                    required
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 font-mono select-none">pts</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-1">
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block text-[11px]">Assign Automated Destination To</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-gray-950 font-semibold focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-sans"
              >
                {TEAM_ROSTER.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Active Rule Array
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Rules list display */}
      <div className="space-y-2.5 text-xs">
        {rules.length === 0 ? (
          <div className="border border-dashed border-gray-200 p-8 rounded-xl text-center space-y-2 bg-gray-50/20">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
            <div>
              <p className="font-bold text-gray-600">No Custom Rules Defined</p>
              <p className="text-[11px] text-gray-400">All newly ingested leads automatically default to a baseline round-robin strategy.</p>
            </div>
          </div>
        ) : (
          rules.map((rule, idx) => {
            const isSource = rule.criterion === 'source';
            return (
              <div 
                key={rule.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded-xl p-3.5 gap-4 transition-all ${
                  rule.isActive 
                    ? 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-blue-200 hover:shadow-[0_4px_12px_rgba(37,99,235,0.03)]' 
                    : 'border-gray-100 bg-gray-50/20 text-gray-400 opacity-70'
                }`}
              >
                {/* Left Side: Rule details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200/60 uppercase select-none">
                      {idx + 1}
                    </span>
                    <span className={`font-semibold text-[13px] ${rule.isActive ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                      {rule.name}
                    </span>
                  </div>

                  {/* Conditions metadata badge */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-sans">
                    <span className="text-gray-400">Execution condition:</span>
                    
                    <span className="inline-flex items-center gap-1 font-mono font-bold bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded text-gray-700">
                      IF 
                      <span className="text-blue-600 uppercase text-[9px] font-sans font-bold">{rule.criterion}</span>
                      
                      {isSource ? (
                        <span className="text-emerald-600 text-[10px]">&quot;{rule.value}&quot;</span>
                      ) : (
                        <>
                          <span className="text-amber-600 font-bold">
                            {rule.operator === 'greater_than' ? '>' : rule.operator === 'less_than' ? '<' : '='}
                          </span>
                          <span className="text-amber-800 font-bold">{rule.value} pts</span>
                        </>
                      )}
                    </span>

                    <span className="text-gray-400">→ Destination:</span>
                    <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-indigo-700 font-semibold">
                      <Users className="w-3 h-3 text-indigo-500" />
                      {rule.assignee}
                    </span>
                  </div>
                </div>

                {/* Right Side: Toggles and Trash */}
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                  
                  {/* Toggle */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold font-mono tracking-wider uppercase select-none ${rule.isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {rule.isActive ? 'Active' : 'Muted'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(rule.id)}
                      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                        rule.isActive ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition duration-150 ease-in-out ${
                          rule.isActive ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-4 w-px bg-gray-100" />

                  {/* Remove action button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title={`Delete rule "${rule.name}"`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dynamic Simulator Section */}
      <div className="bg-slate-50/50 rounded-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-1.5 border-b border-gray-200/40 pb-2">
          <Sparkles className="w-4 h-4 text-pink-500" />
          <h4 className="font-bold text-gray-900 upercase text-[11px] font-mono tracking-wide">
            Lead Routing Simulator Sandbox
          </h4>
          <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.2 rounded border border-pink-100/50 uppercase ml-auto">
            Test Rules
          </span>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Simulate an incoming lead object through your active criteria filters instantly. Perfect for evaluating priorities and verifying custom dispatch pathways prior to launch.
        </p>

        {/* Sandbox controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase font-mono text-gray-400">Lead Source</span>
            <select
              value={simSource}
              onChange={(e) => setSimSource(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-950 font-medium focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-mono"
            >
              {SOURCES.map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-gray-700 block text-[10px] uppercase font-mono text-gray-400">Calculated Score</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={simScore}
                onChange={(e) => setSimScore(Number(e.target.value))}
                className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="font-semibold font-mono text-gray-800 bg-white border border-gray-200 px-2.5 py-1 rounded-sm shadow-2xs">
                {simScore} pts
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Output box */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={handleRunSimulation}
            className="flex items-center gap-1 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white font-semibold py-1.5 px-4 rounded-lg cursor-pointer text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            Evaluate Routing Path
          </button>

          {simResult && (
            <div className={`flex-1 min-w-[280px] p-3 rounded-lg border flex items-start gap-2.5 animate-fade-in ${
              simResult.matchedRule 
                ? 'bg-blue-50/40 border-blue-100 text-blue-900' 
                : 'bg-amber-50/20 border-amber-100 text-amber-900'
            }`}>
              {simResult.matchedRule ? (
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1 px-1 py-0.2 select-none uppercase font-mono text-[9px] text-gray-500 tracking-wider">
                  Resolved Assignee: 
                  <span className="text-[11px] font-sans font-extrabold text-blue-700 normal-case ml-1">
                    {simResult.assignedTo}
                  </span>
                </div>
                <p className="text-[11px] font-medium leading-relaxed font-mono text-gray-600">
                  {simResult.log}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
