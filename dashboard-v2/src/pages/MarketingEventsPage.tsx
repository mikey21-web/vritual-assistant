import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, Calendar, MapPin, QrCode } from 'lucide-react';

export default function MarketingEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', eventType: 'LAUNCH', startAt: '', endAt: '', location: '', capacity: '' });

  const load = async () => {
    try { setEvents(await api('/marketing-events')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api('/marketing-events', { method: 'POST', body: JSON.stringify({ ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined }) });
      toast.success('Event created');
      setShowCreate(false);
      setForm({ name: '', eventType: 'LAUNCH', startAt: '', endAt: '', location: '', capacity: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Events & Launches</h1>
          <p className="text-sm text-muted-foreground">Manage launches, events, RSVPs, and check-ins</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Event</Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Event name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}>
              <option value="LAUNCH">Launch</option>
              <option value="OPEN_HOUSE">Open House</option>
              <option value="BUYER_MEET">Buyer Meet</option>
              <option value="EXHIBITION">Exhibition</option>
              <option value="WEBINAR">Webinar</option>
              <option value="OTHER">Other</option>
            </select>
            <Input type="datetime-local" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} />
            <Input type="datetime-local" value={form.endAt} onChange={e => setForm({ ...form, endAt: e.target.value })} placeholder="End (optional)" />
            <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Input type="number" placeholder="Capacity (optional)" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={create}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((e: any) => (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{e.eventType}</Badge>
                <Badge>{e._count?.invitees || 0} invited</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{e.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(e.startAt).toLocaleDateString()}</div>
              {e.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{e.location}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => window.location.hash = `/events/${e.id}`}><Calendar className="h-4 w-4 mr-1" /> Details</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
