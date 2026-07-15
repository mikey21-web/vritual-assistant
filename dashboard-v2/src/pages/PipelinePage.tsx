import { useState, useEffect, useCallback } from "react";
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../lib/api";
import toast from "react-hot-toast";

interface Stage {
  id: string; name: string; status: string; order: number; color: string; isEnd: boolean; active: boolean; count: number;
}

interface Lead {
  id: string; status: string; score: number; segment: string; priority: number; updatedAt: string;
  contact?: { id: string; name: string; email: string; phone: string };
  assignedAgent?: { id: string; name: string };
}

function LeadCard({ lead, dragHandleProps }: { lead: Lead; dragHandleProps?: any }) {
  const daysInStage = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
  const initials = lead.contact?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const segmentColors: Record<string, string> = { HOT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", WARM: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", COLD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", UNQUALIFIED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow" {...dragHandleProps}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-[var(--foreground)] leading-tight line-clamp-2 min-w-0">
          {lead.contact?.name || "Unknown"}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${segmentColors[lead.segment] || segmentColors.UNQUALIFIED}`}>
          {lead.segment}
        </span>
        {lead.score > 0 && <span className="text-[10px] font-medium text-[var(--muted-foreground)]">{lead.score}pts</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-[var(--primary)] flex items-center justify-center text-[8px] font-bold text-[var(--primary-foreground)]">
            {initials}
          </div>
          {lead.assignedAgent && <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-16">{lead.assignedAgent.name}</span>}
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">{daysInStage}d</span>
      </div>
    </div>
  );
}

function DraggableLead({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { type: "lead", lead } });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <LeadCard lead={lead} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function StageColumn({ stage, leads }: { stage: Stage; leads: Lead[] }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: stage.id, data: { type: "stage", stage } });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-72 flex flex-col rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 max-h-full" style={{ transform: CSS.Transform.toString(transform), transition }}>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]" {...attributes} {...listeners}>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="text-sm font-semibold text-[var(--foreground)]">{stage.name}</span>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] bg-[var(--muted)] px-1.5 py-0.5 rounded-full">{leads.length}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <DraggableLead key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && <div className="flex items-center justify-center h-20 text-xs text-[var(--muted-foreground)]">No leads</div>}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead[]>>({});
  const [activeDrag, setActiveDrag] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (stages.length > 0 && selectedStage === null) {
      setSelectedStage(stages[0].status);
    }
  }, [stages, selectedStage]);

  const fetchData = useCallback(async () => {
    try {
      const stageRes = await api("/pipeline-stages");
      const stagesData: Stage[] = stageRes;
      setStages(stagesData);
      const leadMap: Record<string, Lead[]> = {};
      for (const stage of stagesData) {
        const res = await api(`/leads?status=${stage.status}&limit=50`);
        leadMap[stage.status] = res.data || [];
      }
      setLeads(leadMap);
    } catch { toast.error("Failed to load pipeline"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "stage") return;
    const leadId = event.active.id as string;
    for (const status in leads) {
      const found = leads[status].find(l => l.id === leadId);
      if (found) { setActiveDrag(found); break; }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const overData = over.data.current;
    let targetStatus: string | null = null;
    if (overData?.type === "stage") {
      targetStatus = overData.stage.status;
    } else {
      for (const status in leads) {
        if (leads[status].some(l => l.id === over.id)) {
          targetStatus = status;
          break;
        }
      }
    }
    if (!targetStatus) return;
    const leadId = active.id as string;
    let sourceStatus: string | null = null;
    for (const status in leads) {
      if (leads[status].some(l => l.id === leadId)) {
        sourceStatus = status;
        break;
      }
    }
    if (!sourceStatus || sourceStatus === targetStatus) return;

    const prevLeads = { ...leads };
    const sourceLeads = [...(leads[sourceStatus] || [])];
    const leadIdx = sourceLeads.findIndex(l => l.id === leadId);
    if (leadIdx === -1) return;
    const movedLead = { ...sourceLeads[leadIdx], status: targetStatus };
    sourceLeads.splice(leadIdx, 1);
    const targetLeads = [...(leads[targetStatus] || []), movedLead];
    setLeads({ ...leads, [sourceStatus]: sourceLeads, [targetStatus]: targetLeads });

    try {
      const result = await api(`/leads/${leadId}/move-stage`, { method: "PATCH", body: JSON.stringify({ status: targetStatus }) });
      setLeads(prev => {
        const updatedStatus = result.status;
        const sLeads = [...(prev[sourceStatus!] || [])];
        const idx = sLeads.findIndex(l => l.id === leadId);
        const updatedLeads = [...(prev[updatedStatus] || [])];
        const existingIdx = updatedLeads.findIndex(l => l.id === leadId);
        if (idx !== -1) {
          sLeads.splice(idx, 1);
          if (existingIdx === -1) {
            updatedLeads.push(result);
          } else {
            updatedLeads[existingIdx] = result;
          }
          return { ...prev, [sourceStatus!]: sLeads, [updatedStatus]: updatedLeads };
        }
        return prev;
      });
    } catch {
      setLeads(prevLeads);
      toast.error("Failed to move lead");
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">Loading pipeline...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: stacks on mobile, row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Sales Pipeline</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button onClick={fetchData} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
            Refresh
          </button>
          <button onClick={() => setManageOpen(!manageOpen)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
            Manage Stages
          </button>
        </div>
      </div>

      {/* Mobile layout (< md): stage pills + selected stage leads */}
      <div className="flex flex-col flex-1 md:hidden min-h-0">
        {/* Stage selector pills - horizontal scrollable */}
        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0">
          {stages.map(stage => (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.status)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedStage === stage.status
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
              {stage.name}
              <span className="text-[11px] opacity-70">({leads[stage.status]?.length || 0})</span>
            </button>
          ))}
        </div>

        {/* Lead list for selected stage - vertical scroll */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {selectedStage && (leads[selectedStage] || []).map(lead => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {selectedStage && (!leads[selectedStage] || leads[selectedStage].length === 0) && (
            <div className="flex items-center justify-center h-20 text-xs text-[var(--muted-foreground)]">No leads in this stage</div>
          )}
        </div>
      </div>

      {/* Desktop layout (>= md): DnD Kanban board */}
      <div className="hidden md:flex flex-1 overflow-x-auto">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full pb-4" style={{ minWidth: stages.length * 288 + (stages.length - 1) * 16 }}>
            {stages.map(stage => (
              <StageColumn key={stage.id} stage={stage} leads={leads[stage.status] || []} />
            ))}
          </div>
          <DragOverlay>
            {activeDrag && <div className="w-72 opacity-85"><LeadCard lead={activeDrag} /></div>}
          </DragOverlay>
        </DndContext>
      </div>

      {manageOpen && <ManageStagesPanel stages={stages} onClose={() => { setManageOpen(false); fetchData(); }} />}
    </div>
  );
}

function ManageStagesPanel({ stages, onClose }: { stages: Stage[]; onClose: () => void }) {
  const [orderedStages, setOrderedStages] = useState([...stages].sort((a, b) => a.order - b.order));
  const [editing, setEditing] = useState<Record<string, { name: string; color: string }>>({});
  const [saving, setSaving] = useState(false);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...orderedStages];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setOrderedStages(next);
  };

  const moveDown = (idx: number) => {
    if (idx === orderedStages.length - 1) return;
    const next = [...orderedStages];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setOrderedStages(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/pipeline-stages/reorder", {
        method: "PATCH",
        body: JSON.stringify({ stageIds: orderedStages.map(s => s.id) }),
      });
      for (const [id, vals] of Object.entries(editing)) {
        await api(`/pipeline-stages/${id}`, {
          method: "PATCH",
          body: JSON.stringify(vals),
        });
      }
      toast.success("Stages updated");
      onClose();
    } catch { toast.error("Failed to update stages"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-xl sm:rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Manage Stages</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg leading-none">&times;</button>
        </div>
        <div className="space-y-2 mb-4">
          {orderedStages.map((stage, idx) => (
            <div key={stage.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] p-2.5">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(idx)} className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] leading-none">&uarr;</button>
                <button onClick={() => moveDown(idx)} className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] leading-none">&darr;</button>
              </div>
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: editing[stage.id]?.color || stage.color }} />
              <div className="flex-1 min-w-0">
                <input
                  className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none text-[var(--foreground)]"
                  defaultValue={stage.name}
                  onChange={e => setEditing(prev => ({ ...prev, [stage.id]: { ...prev[stage.id], name: e.target.value } }))}
                />
                <span className="text-[10px] text-[var(--muted-foreground)]">{stage.status}</span>
              </div>
              <input
                type="color"
                className="h-6 w-8 rounded cursor-pointer border-0 p-0"
                defaultValue={stage.color}
                onChange={e => setEditing(prev => ({ ...prev, [stage.id]: { ...prev[stage.id], color: e.target.value } }))}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)]">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
