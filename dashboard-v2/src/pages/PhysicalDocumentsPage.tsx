import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, FileText, MapPin, ArrowRightLeft } from 'lucide-react';

export default function PhysicalDocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [locationMap, setLocationMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ entityType: 'LEAD', entityId: '', documentType: 'AADHAR', title: '', description: '', cabinetName: '', shelfNumber: '' });

  const load = async () => {
    try { setDocs(await api('/physical-documents')); } catch { /* noop */ }
    try { setLocationMap(await api('/physical-documents/location-map/all')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api(`/physical-documents`, { method: `POST`, body: JSON.stringify(form) }); toast.success('Document record created'); setShowCreate(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const transfer = async (id: string) => {
    const newHolder = prompt('New holder user ID:');
    if (!newHolder) return;
    try { await api(`/physical-documents/${id}/transfer`, { method: 'POST', body: JSON.stringify({ newHolderId: newHolder }) }); toast.success('Custody transferred'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Physical Document Custody</h1><p className="text-sm text-muted-foreground">Track physical documents, cabinets, and movements</p></div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Record</Button>
      </div>

      {showCreate && (
        <Card><CardContent className="pt-4 space-y-3">
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.entityType} onChange={e => setForm({ ...form, entityType: e.target.value })}>
            <option value="LEAD">Lead</option><option value="CONTACT">Contact</option><option value="BOOKING">Booking</option><option value="PROJECT">Project</option><option value="UNIT">Unit</option>
          </select>
          <Input placeholder="Entity ID" value={form.entityId} onChange={e => setForm({ ...form, entityId: e.target.value })} />
          <Input placeholder="Document type (e.g., AADHAR, SALE_DEED)" value={form.documentType} onChange={e => setForm({ ...form, documentType: e.target.value })} />
          <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Cabinet name" value={form.cabinetName} onChange={e => setForm({ ...form, cabinetName: e.target.value })} />
          <Input placeholder="Shelf number" value={form.shelfNumber} onChange={e => setForm({ ...form, shelfNumber: e.target.value })} />
          <div className="flex gap-2"><Button onClick={create}>Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      {locationMap && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{locationMap.totalDocuments}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">In Storage</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-600">{locationMap.inStorage}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Checked Out</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{locationMap.checkedOut}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cabinets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{locationMap.cabinets?.length || 0}</p></CardContent></Card>
        </div>
      )}

      <div className="grid gap-4">
        {docs.map((d: any) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div><CardTitle className="text-base">{d.title}</CardTitle><p className="text-xs text-muted-foreground">{d.documentType} · {d.entityType}:{d.entityId.slice(-8)}</p></div>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === 'IN_STORAGE' ? 'default' : 'secondary'}>{d.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => transfer(d.id)}><ArrowRightLeft className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm flex items-center gap-4">
              <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{d.cabinetName || 'N/A'} {d.shelfNumber ? `/ Shelf ${d.shelfNumber}` : ''}</span>
              {d.currentHolder && <span>Holder: {d.currentHolder.name}</span>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
