/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  MapPin, Calendar, DollarSign, Tag, CheckCircle, Plus, 
  Trash2, Mail, Phone, MessageSquare, Globe, Sparkles, 
  Check, Clock, User, Clipboard, Save, HelpCircle 
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import toast from 'react-hot-toast';

interface LeadDetailExpandedProps {
  row: Lead;
  onUpdate?: (updatedLead: Lead) => void;
  onDelete?: (id: string) => void;
}

// Map highly realistic descriptions for initial records so they look superb right away!
const getFallbackDescription = (id: string, name: string): string => {
  const fallbacks: Record<string, string> = {
    'L-9041': 'Sarah Jenkins is looking to integrate legacy Oracle ERP databases with unified automated client acquisition channels. Highlight high-tier Q2 enterprise features.',
    'L-9040': 'Marcus requested detailed enterprise volume prices. Key concern is latency under high concurrent webhook callbacks. Schedule technical review call.',
    'L-9039': 'Aiden is assessing our webhook streaming schemas. Seeking sample JSON structures and auto-balancing channel documentation. Developer audience focus.',
    'L-9038': 'Elena signed up via EU expansion campaign. Focus is GDPR multi-region compliance and cross-border workspace data residency configuration.',
    'L-9037': 'David represents our first premium APAC deal. Fully set up on WhatsApp dispatchers. Monitor outbound throughput limits for unexpected spikes.',
    'L-9036': 'Olivia registered interest during live product launch event. Contact info is correct, but follow-up emails bounced. Mark for secondary phone campaigns.',
    'L-9035': 'Jonathan is evaluating high-frequency API gateway triggers. Interested in custom Scoring weights to fast-track enterprise routing rules.'
  };

  return fallbacks[id] || `Consumer profile indexed automatically via ${name || 'API Gateway'} channel. Prepared for immediate campaign attribution and routing workflows.`;
};

const getFallbackTags = (id: string): string[] => {
  const fallbacks: Record<string, string[]> = {
    'L-9041': ['Enterprise', 'Core ERP', 'High-Tier'],
    'L-9040': ['Demo Requested', 'High Value', 'Vanguard'],
    'L-9039': ['Webhooks', 'Developer', 'API Tech'],
    'L-9038': ['EU Compliance', 'Webinar Q2'],
    'L-9037': ['APAC Core', 'Onboarded', 'VIP'],
    'L-9036': ['Launch Attendee', 'Bounce Alert'],
    'L-9035': ['Scoring Intel', 'SaaS Tech']
  };

  return fallbacks[id] || ['Inbound', 'Standard Tier'];
};

const getFallbackLocation = (id: string): string => {
  const fallbacks: Record<string, string> = {
    'L-9041': 'San Francisco, CA',
    'L-9040': 'Austin, TX',
    'L-9039': 'Seattle, WA',
    'L-9038': 'Paris, France',
    'L-9037': 'Seoul, South Korea',
    'L-9036': 'New York, NY',
    'L-9035': 'Chicago, IL'
  };

  return fallbacks[id] || 'Remote Inbound';
};

export default function LeadDetailExpanded({
  row,
  onUpdate,
  onDelete
}: LeadDetailExpandedProps) {
  // Safe local properties
  const initialNotes = row.notes || getFallbackDescription(row.id, row.name);
  const initialTags = row.tags || getFallbackTags(row.id);
  const initialLocation = row.countryOrCity || getFallbackLocation(row.id);
  const initialContact = row.lastContacted || new Date(new Date(row.dateCreated).getTime() + 86400000).toISOString().split('T')[0];

  // Local interactive states
  const [notes, setNotes] = useState(initialNotes);
  const [location, setLocation] = useState(initialLocation);
  const [contactDate, setContactDate] = useState(initialContact);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Quick Action triggers
  const executeSimulation = (type: 'SMS' | 'EMAIL' | 'CALL') => {
    toast.loading(`Simulating dynamic secure ${type} stream...`, { id: 'sim-toast', duration: 1200 });
    
    setTimeout(() => {
      // Auto upgrade lead status when contacting
      let updatedStatus: LeadStatus = row.status;
      if (row.status === 'New') {
        updatedStatus = 'Contacted';
      }

      const todayStr = new Date().toISOString().split('T')[0];
      setContactDate(todayStr);

      const modifiedLead: Lead = {
        ...row,
        status: updatedStatus,
        lastContacted: todayStr,
        notes: notes,
        tags: tags,
        countryOrCity: location
      };

      if (onUpdate) {
        onUpdate(modifiedLead);
      }

      toast.success(`${type} Dispatch simulated successfully! Outbound log registered on tenant stream.`, { 
        id: 'sim-toast',
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '12px'
        }
      });
    }, 1000);
  };

  // State Save
  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      const modifiedLead: Lead = {
        ...row,
        notes: notes,
        tags: tags,
        countryOrCity: location,
        lastContacted: contactDate
      };
      
      if (onUpdate) {
        onUpdate(modifiedLead);
      }
      setIsSaving(false);
      toast.success('Lead records updated successfully.', {
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '12px'
        }
      });
    }, 400);
  };

  // Tag operators
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTag.trim();
    if (!cleanTag) return;
    if (tags.some(t => t.toLowerCase() === cleanTag.toLowerCase())) {
      toast.error('Tag already assigned');
      return;
    }
    const updatedTags = [...tags, cleanTag];
    setTags(updatedTags);
    setNewTag('');

    // Silent update if handler exists
    if (onUpdate) {
      onUpdate({
        ...row,
        tags: updatedTags
      });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    if (onUpdate) {
      onUpdate({
        ...row,
        tags: updatedTags
      });
    }
    toast.success(`Removed tag "${tagToRemove}"`);
  };

  const formattedDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="bg-white border border-gray-200/60 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] p-6 animate-fade-in relative overflow-hidden text-gray-800">
      
      {/* Visual Accent Top Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Editable Notes & Interactive Textarea (6 Cols) */}
        <div className="lg:col-span-7 col-span-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-xs text-gray-900 font-display flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Clipboard className="w-3.5 h-3.5 text-blue-500" />
              Lead Notes & Intelligence Summary
            </h4>
            
            {row.notes !== notes && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                Unsaved edits
              </span>
            )}
          </div>

          <div className="relative flex-1">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => setIsNotesFocused(true)}
              onBlur={() => setIsNotesFocused(false)}
              className={`w-full min-h-[140px] p-3 text-xs text-gray-700 bg-gray-50/50 border rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/20 font-sans transition-all leading-relaxed ${
                isNotesFocused ? 'border-blue-500 bg-white shadow-[0_2px_8px_rgba(37,99,235,0.05)]' : 'border-gray-200'
              }`}
              placeholder="Record lead conversations, requirements, or specialized follow-up protocols..."
            />
            {notes.trim().length === 0 && (
              <p className="text-[10px] text-gray-400 italic absolute right-2 bottom-2">Empty notes</p>
            )}
          </div>

          {/* Quick micro action logs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Registered Ingress: {formattedDate(row.dateCreated)}</span>
            </div>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg border border-transparent shadow-[var(--shadow-subtle)] cursor-pointer transition-colors shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Meta Records'}
            </button>
          </div>
        </div>

        {/* Right Column: Key Attributes & Tag Cloud (5 Cols) */}
        <div className="lg:col-span-5 col-span-1 border-t lg:border-t-0 lg:border-l border-gray-100 lg:pl-6 pt-5 lg:pt-0 space-y-5">
          
          <h4 className="font-semibold text-xs text-gray-900 font-display flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            CRM Metadata Attributes
          </h4>

          {/* Property Fields Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-gray-50/60 border border-gray-100 rounded-lg space-y-1">
              <div className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase">
                <MapPin className="w-3 h-3 text-gray-400" /> Location
              </div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent p-0 text-[11px] font-semibold text-gray-900 border-none focus:outline-none focus:ring-0 font-sans"
              />
            </div>

            <div className="p-2.5 bg-gray-50/60 border border-gray-100 rounded-lg space-y-1">
              <div className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase">
                <Calendar className="w-3 h-3 text-gray-400" /> Last Contacted
              </div>
              <input
                type="date"
                value={contactDate}
                onChange={(e) => setContactDate(e.target.value)}
                className="w-full bg-transparent p-0 text-[11px] font-semibold text-gray-900 border-none focus:outline-none focus:ring-0 font-mono"
              />
            </div>

            <div className="p-2.5 bg-gray-50/60 border border-gray-100 rounded-lg space-y-1">
              <div className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase">
                <Globe className="w-3 h-3 text-gray-400" /> Channel Source
              </div>
              <div className="text-[11px] font-semibold text-gray-900 font-mono uppercase">
                {row.source}
              </div>
            </div>

            <div className="p-2.5 bg-gray-50/60 border border-gray-100 rounded-lg space-y-1 animate-pulse-slow">
              <div className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase">
                <DollarSign className="w-3 h-3 text-gray-400" /> Pipeline Value
              </div>
              <div className="text-[11px] font-bold text-emerald-600 font-mono">
                ${row.value.toLocaleString()} USD
              </div>
            </div>
          </div>

          {/* Interactive Tag Management */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase">
              <Tag className="w-3.5 h-3.5" /> Core Tags Management
            </span>
            
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
              {tags.length === 0 ? (
                <span className="text-gray-400 text-[11px] italic">No active tags assigned.</span>
              ) : (
                tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold font-mono text-[9px] px-2 py-0.5 rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-indigo-400 hover:text-indigo-800 focus:outline-none cursor-pointer"
                      title={`Remove tag "${tag}"`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* inline input to add tag */}
            <form onSubmit={handleAddTag} className="flex gap-1.5">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Assign brief tag (e.g. VIP, CRM, SaaS)..."
                className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-800 focus:outline-none focus:border-blue-500 font-sans shadow-inner"
              />
              <button
                type="submit"
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 font-bold p-1 px-2 text-xs rounded-lg cursor-pointer transition-colors flex items-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Interactive Outreach Simulators */}
          <div className="space-y-2 border-t border-gray-100/80 pt-3">
            <span className="text-[10px] font-bold text-gray-400 font-mono flex items-center gap-1 uppercase select-none">
              <User className="w-3.5 h-3.5" /> Quick Communication simulation
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => executeSimulation('SMS')}
                className="flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 hover:border-emerald-200 text-[10px] font-bold uppercase tracking-tight py-1.5 rounded-lg cursor-pointer transition-all duration-150"
              >
                <MessageSquare className="w-3 h-3" /> SMS
              </button>
              <button
                type="button"
                onClick={() => executeSimulation('EMAIL')}
                className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100/60 hover:border-blue-200 text-[10px] font-bold uppercase tracking-tight py-1.5 rounded-lg cursor-pointer transition-all duration-150"
              >
                <Mail className="w-3 h-3" /> Email
              </button>
              <button
                type="button"
                onClick={() => executeSimulation('CALL')}
                className="flex items-center justify-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100/60 hover:border-purple-200 text-[10px] font-bold uppercase tracking-tight py-1.5 rounded-lg cursor-pointer transition-all duration-150"
              >
                <Phone className="w-3 h-3" /> Call Log
              </button>
            </div>
          </div>

          {/* Destructive Action Trigger */}
          {onDelete && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to permanently execute deletion of "${row.name}" record?`)) {
                    onDelete(row.id);
                    toast.success('Lead records deleted successfully.');
                  }
                }}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-tight cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Delete Record
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
