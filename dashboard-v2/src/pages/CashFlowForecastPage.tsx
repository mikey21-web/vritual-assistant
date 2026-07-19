import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

export default function CashFlowForecastPage() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ projectId: '', label: '', periodStart: '', periodEnd: '', expectedInflowsPaise: '', expectedOutflowsPaise: '', assumptions: '', scenario: 'BASE' });

  const load = async () => {
    try { setForecasts(await api('/cash-flow-forecast')); } catch { /* noop */ }
    try { setProjects(await api('/projects')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api(`/cash-flow-forecast`, { method: `POST`, body: JSON.stringify(form) }); toast.success('Forecast created'); setShowCreate(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const generate = async (projectId: string) => {
    try { await api(`/cash-flow-forecast/generate/${projectId}`, { method: 'POST' }); toast.success('Projections generated'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Cash Flow Forecasting</h1><p className="text-sm text-muted-foreground">Project and actual cash flows</p></div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Forecast</Button>
      </div>

      {showCreate && (
        <Card><CardContent className="pt-4 space-y-3">
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
            <option value="">Select project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Input placeholder="Label (e.g., Q1 2026)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
          <Input type="date" value={form.periodStart} onChange={e => setForm({ ...form, periodStart: e.target.value })} />
          <Input type="date" value={form.periodEnd} onChange={e => setForm({ ...form, periodEnd: e.target.value })} />
          <Input type="number" placeholder="Expected Inflows (paise)" value={form.expectedInflowsPaise} onChange={e => setForm({ ...form, expectedInflowsPaise: e.target.value })} />
          <Input type="number" placeholder="Expected Outflows (paise)" value={form.expectedOutflowsPaise} onChange={e => setForm({ ...form, expectedOutflowsPaise: e.target.value })} />
          <div className="flex gap-2"><Button onClick={create}>Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      <div className="grid gap-4">
        {forecasts.length === 0 && <p className="text-muted-foreground">No forecasts yet.</p>}
        {forecasts.map((f: any) => (
          <Card key={f.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{f.label}</CardTitle>
                <Badge variant={f.status === 'ACTUAL' ? 'default' : f.status === 'PROJECTED' ? 'secondary' : 'outline'}>{f.status || f.scenario}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{f.project?.name} · {new Date(f.periodStart).toLocaleDateString()} - {new Date(f.periodEnd).toLocaleDateString()}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Expected Inflow</p><p className="font-semibold text-emerald-600">₹{(Number(f.expectedInflowsPaise) / 100).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Expected Outflow</p><p className="font-semibold text-red-600">₹{(Number(f.expectedOutflowsPaise) / 100).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Actual Inflow</p><p className="font-semibold">₹{(Number(f.actualInflowsPaise) / 100).toLocaleString()}</p></div>
                <div><p className="text-muted-foreground">Actual Outflow</p><p className="font-semibold">₹{(Number(f.actualOutflowsPaise) / 100).toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
