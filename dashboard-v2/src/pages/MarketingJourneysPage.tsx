import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, Play, Pause, Users, Eye, BarChart3 } from 'lucide-react';

export default function MarketingJourneysPage() {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', entryEventType: 'lead.created', entryConditions: '' });

  const load = async () => {
    try {
      const data = await api('/marketing-journeys');
      setJourneys(data);
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      const conditions = form.entryConditions ? JSON.parse(form.entryConditions) : undefined;
      await api('/marketing-journeys', { method: 'POST', body: JSON.stringify({ name: form.name, entryEventType: form.entryEventType, entryConditions: conditions }) });
      toast.success('Journey created');
      setShowCreate(false);
      setForm({ name: '', entryEventType: 'lead.created', entryConditions: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const activate = async (id: string) => {
    try { await api(`/marketing-journeys/${id}/activate`, { method: 'POST' }); toast.success('Journey activated'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const pause = async (id: string) => {
    try { await api(`/marketing-journeys/${id}/pause`, { method: 'POST' }); toast.success('Journey paused'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Journeys</h1>
          <p className="text-sm text-muted-foreground">Build multi-step nurture flows</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Journey</Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Journey name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.entryEventType} onChange={e => setForm({ ...form, entryEventType: e.target.value })}>
              <option value="lead.created">Lead Created</option>
              <option value="lead.converted">Lead Converted</option>
              <option value="site_visit.completed">Site Visit Completed</option>
              <option value="booking.created">Booking Created</option>
            </select>
            <Input placeholder='Entry conditions (JSON, optional)' value={form.entryConditions} onChange={e => setForm({ ...form, entryConditions: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={create}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {journeys.length === 0 && <p className="text-muted-foreground">No journeys yet. Create your first.</p>}
        {journeys.map((j: any) => (
          <Card key={j.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">{j.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Version {j.version} · {j.entryEventType}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={j.status === 'ACTIVE' ? 'default' : j.status === 'PAUSED' ? 'secondary' : 'outline'}>{j.status}</Badge>
                {j.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => activate(j.id)}><Play className="h-4 w-4 mr-1" /> Activate</Button>}
                {j.status === 'ACTIVE' && <Button size="sm" variant="outline" onClick={() => pause(j.id)}><Pause className="h-4 w-4 mr-1" /> Pause</Button>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {j._count?.enrollments || 0} enrolled</span>
                <span className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> {j._count?.steps || 0} steps</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
