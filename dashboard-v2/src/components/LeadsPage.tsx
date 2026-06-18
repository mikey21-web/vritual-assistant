/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import DataTable, { Column } from './DataTable';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import LeadDetailExpanded from './LeadDetailExpanded';
import { Lead, LeadStatus } from '../types';
import { Plus, Download, RefreshCw, Layers, Sparkles, Filter, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface LeadsPageProps {
  leads: Lead[];
  onAddLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onBulkUpdate: (ids: Set<string>, status: LeadStatus) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
}

export default function LeadsPage({
  leads,
  onAddLead,
  onDeleteLead,
  onBulkUpdate,
  onUpdateLead
}: LeadsPageProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDemoEmpty, setIsDemoEmpty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search handle
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  const handleSimulateLoad = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Lead database refreshed successfully! (Fetched latest)', {
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '13px',
          border: '1px solid rgba(228, 228, 231, 0.15)',
          fontFamily: 'Inter, sans-serif',
        },
      });
    }, 1000);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const pageLeads = filteredLeads.slice(0, 8); // matches DataTable itemsPerPage sizing
      const newSelected = new Set(selectedIds);
      pageLeads.forEach((row) => newSelected.add(row.id));
      setSelectedIds(newSelected);
    } else {
      const pageLeads = filteredLeads.slice(0, 8);
      const newSelected = new Set(selectedIds);
      pageLeads.forEach((row) => newSelected.delete(row.id));
      setSelectedIds(newSelected);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    if (selectedIds.size === 0) {
      toast.error('No leads selected');
      return;
    }
    onBulkUpdate(selectedIds, status);
    toast.success(`Successfully updated ${selectedIds.size} leads to status: ${status}`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
    setSelectedIds(new Set());
    setBulkStatusOpen(false);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach(id => onDeleteLead(id));
    toast.success(`Successfully deleted ${selectedIds.size} records permanently.`, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
    setSelectedIds(new Set());
  };

  const handleAddManualLead = () => {
    const manualId = `L-9${Math.floor(Math.random() * 900) + 100}`;
    const newLead: Lead = {
      id: manualId,
      name: 'Eleanor Vance',
      email: 'e.vance@shirley.inc',
      phone: '+1 (555) 700-1122',
      campaignName: 'Inbound Demo Request',
      status: 'New',
      value: 14000,
      source: 'Cold Outreach',
      dateCreated: new Date().toISOString(),
      avatarColor: 'bg-teal-100 text-teal-800'
    };
    onAddLead(newLead);
    toast.success('Inserted Manual Lead ID: ' + manualId, {
      style: {
        background: '#09090b',
        color: '#f4f4f5',
        fontSize: '13px',
        border: '1px solid rgba(228, 228, 231, 0.15)',
        fontFamily: 'Inter, sans-serif',
      },
    });
  };

  const handleExport = () => {
    if (displayLeads.length === 0) {
      toast.error('No lead records to export');
      return;
    }

    // CSV Headers
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Campaign Name', 'Source', 'Status', 'Pipeline Value', 'Date Created'];
    
    // CSV Rows compilation with string escape processing
    const csvRows = displayLeads.map((lead) => {
      const fields = [
        lead.id,
        lead.name,
        lead.email,
        lead.phone,
        lead.campaignName,
        lead.source,
        lead.status,
        lead.value,
        lead.dateCreated || ''
      ];

      return fields.map((field) => {
        const textValue = String(field);
        // Escape quotes and wrap values containing commas/quotes/newlines in quotes
        if (textValue.includes(',') || textValue.includes('"') || textValue.includes('\n')) {
          return `"${textValue.replace(/"/g, '""')}"`;
        }
        return textValue;
      });
    });

    const csvContent = [headers.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    
    // Generate browser download sequence
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lead-Auto-Export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Export successful! Saved ${displayLeads.length} lead records to CSV`, {
        style: {
          background: '#09090b',
          color: '#f4f4f5',
          fontSize: '13px',
          border: '1px solid rgba(228, 228, 231, 0.15)',
          fontFamily: 'Inter, sans-serif',
        },
      });
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast.error('Failed to trigger CSV file export stream.');
    }
  };

  // Define table column render properties
  const columns: Column<Lead>[] = [
    {
      header: 'Identifier/Lead Name',
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold tracking-tight text-[11px] font-sans ${row.avatarColor || 'bg-gray-100 text-gray-800'}`}>
            {row.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="font-semibold text-gray-950 font-display text-[12px] group-hover:text-blue-600 transition-colors">
              {row.name}
            </div>
            <div className="font-mono text-[10px] text-gray-400">
              {row.id}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Target Lead Location/E-mail',
      accessorKey: 'email',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="text-gray-900 font-medium break-all">{row.email}</div>
          <div className="text-[10px] text-gray-400 font-mono tracking-tight">{row.phone}</div>
        </div>
      )
    },
    {
      header: 'Assigned Campaign',
      accessorKey: 'campaignName',
      cell: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-gray-100 bg-gray-50/50 text-[11px] font-medium text-gray-600 font-sans">
          {row.campaignName}
        </span>
      )
    },
    {
      header: 'Orig. Source',
      accessorKey: 'source',
      cell: (row) => (
        <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider">{row.source}</span>
      )
    },
    {
      header: 'Status Code',
      accessorKey: 'status',
      cell: (row) => {
        let badgeColors = 'bg-gray-50/75 border-gray-100 text-gray-500';
        if (row.status === 'New') {
          badgeColors = 'bg-blue-50/50 border-blue-100/60 text-blue-700';
        } else if (row.status === 'Contacted') {
          badgeColors = 'bg-amber-50/50 border-amber-100/60 text-amber-700';
        } else if (row.status === 'Qualified') {
          badgeColors = 'bg-emerald-50/50 border-emerald-100/60 text-emerald-700';
        } else if (row.status === 'Nurturing') {
          badgeColors = 'bg-purple-50/50 border-purple-100/60 text-purple-700';
        } else if (row.status === 'Closed-Won') {
          badgeColors = 'bg-zinc-900 border-zinc-800 text-zinc-100';
        } else if (row.status === 'Closed-Lost') {
          badgeColors = 'bg-gray-100/80 border-gray-200/50 text-gray-400';
        }

        return (
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded border font-mono font-semibold tracking-wide ${badgeColors}`}>
            {row.status}
          </span>
        );
      }
    },
    {
      header: 'Pipeline Value',
      accessorKey: 'value',
      align: 'right',
      cell: (row) => (
        <span className="font-mono font-semibold text-gray-950 text-[12px]">
          ${row.value.toLocaleString()}
        </span>
      )
    },
  ];

  const statusCounts = useMemo(() => {
    const counts = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Nurturing: 0,
      'Closed-Won': 0,
      'Closed-Lost': 0,
    };
    leads.forEach((l) => {
      if (l.status in counts) {
        counts[l.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [leads]);

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    return (
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const displayLeads = isDemoEmpty ? [] : filteredLeads;

  return (
    <div id="leads-page-root" className="space-y-6">
      <PageHeader
        title="Lead Records Directory"
        description="A centralized system archiving automatically aggregated, scored, and distributed high-value enterprise consumer profiles."
        category="Lead Ingestion"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDemoEmpty(!isDemoEmpty)}
              className="px-2.5 py-1.5 border border-gray-200/80 rounded-lg text-xs bg-white hover:bg-gray-50 text-gray-600 font-mono transition-colors cursor-pointer"
            >
              Toggle Simulated: {isDemoEmpty ? 'Has Data' : 'Empty State'}
            </button>
            <button
              onClick={handleSimulateLoad}
              className="p-1.5 border border-gray-200/80 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-all cursor-pointer shadow-[var(--shadow-subtle)]"
              title="Refresh DB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
            <button
              onClick={handleAddManualLead}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer shadow-[var(--shadow-subtle)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead Record
            </button>
          </div>
        }
      />

      {/* Subtle Status Breakdown Summary Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 px-4 bg-white border border-gray-200/50 rounded-xl text-xs select-none shadow-[var(--shadow-subtle)]">
        <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-bold shrink-0">
          Distribution Summary:
        </span>
        
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span className="text-gray-500">New:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts.New}</span>
          </div>
          
          <span className="text-gray-200">/</span>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-gray-500">Contacted:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts.Contacted}</span>
          </div>

          <span className="text-gray-200">/</span>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-gray-500">Qualified:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts.Qualified}</span>
          </div>

          <span className="text-gray-200">/</span>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span className="text-gray-500">Nurturing:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts.Nurturing}</span>
          </div>

          <span className="text-gray-200">/</span>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
            <span className="text-gray-500">Closed-Won:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts['Closed-Won']}</span>
          </div>

          <span className="text-gray-200">/</span>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            <span className="text-gray-500">Closed-Lost:</span>
            <span className="font-mono font-semibold text-gray-950">{statusCounts['Closed-Lost']}</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
          <span>Total Indexed:</span>
          <span className="font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Bulk Operations Bar if any Item is Selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 border border-blue-100 bg-blue-50/30 rounded-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-semibold text-blue-950 font-display">
              {selectedIds.size} Lead Records Selected
            </span>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button
                onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
                className="flex items-center gap-1 bg-white border border-blue-200 text-blue-900 rounded-lg px-2.5 py-1 text-xs font-semibold hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Change Pipeline Status
              </button>
              {bulkStatusOpen && (
                <div className="absolute right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 w-36 text-left animate-slide-up text-xs font-sans">
                  {(['New', 'Contacted', 'Qualified', 'Nurturing', 'Closed-Won', 'Closed-Lost'] as LeadStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleBulkStatusChange(st)}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700 font-mono uppercase tracking-tight text-[10px]"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              className="p-1 px-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-lg text-xs hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Records
            </button>
          </div>
        </div>
      )}

      {/* Primary Data Display */}
      {isLoading ? (
        <Skeleton type="table" />
      ) : (
        <DataTable
          id="leads-data-table"
          data={displayLeads}
          columns={columns}
          searchPlaceholder="Filter indexed directories (e.g. email, status, name, company...)"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          rowIdAccessor="id"
          renderExpandedRow={(row) => (
            <LeadDetailExpanded
              row={row}
              onUpdate={onUpdateLead}
              onDelete={onDeleteLead}
            />
          )}
          actions={
            <button
              onClick={handleExport}
              disabled={displayLeads.length === 0}
              className="flex items-center gap-1 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors shadow-[var(--shadow-subtle)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              Export Directory
            </button>
          }
          emptyState={
            <EmptyState
              id="leads-empty-state"
              icon="search"
              title="No leads indexed"
              description="No active consumer records were discovered matching the search criteria, or filters have completely excluded results."
              actionLabel="Reset Active Filters"
              onAction={() => {
                setSearchQuery('');
                setIsDemoEmpty(false);
                toast.success('Successfully restored directory state.');
              }}
            />
          }
        />
      )}
    </div>
  );
}
