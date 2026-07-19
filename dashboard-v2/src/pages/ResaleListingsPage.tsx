import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, Home, Search } from 'lucide-react';

export default function ResaleListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ unitId: '', listingType: 'RESALE', expectedPricePaise: '', expectedRentPaise: '', description: '' });
  const [filter, setFilter] = useState('');

  const load = async () => {
    try { setListings(await api('/resale-listings')); } catch { /* noop */ }
    try { setUnits(await api('/properties')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api(`/resale-listings`, { method: `POST`, body: JSON.stringify(form) }); toast.success('Listing created'); setShowCreate(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api(`/resale-listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); toast.success(`Status: ${status}`); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  const filtered = listings.filter(l => !filter || l.unit?.project?.name?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Resale & Rental Listings</h1><p className="text-sm text-muted-foreground">Secondary market inventory</p></div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Listing</Button>
      </div>

      {showCreate && (
        <Card><CardContent className="pt-4 space-y-3">
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.unitId} onChange={e => setForm({ ...form, unitId: e.target.value })}>
            <option value="">Select unit</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.unitNo} ({u.project?.name})</option>)}
          </select>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.listingType} onChange={e => setForm({ ...form, listingType: e.target.value })}>
            <option value="RESALE">Resale</option><option value="RENTAL">Rental</option>
          </select>
          <Input type="number" placeholder="Expected price (paise)" value={form.expectedPricePaise} onChange={e => setForm({ ...form, expectedPricePaise: e.target.value })} />
          <Input type="number" placeholder="Expected rent (paise, for rental)" value={form.expectedRentPaise} onChange={e => setForm({ ...form, expectedRentPaise: e.target.value })} />
          <div className="flex gap-2"><Button onClick={create}>Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Filter by project..." value={filter} onChange={e => setFilter(e.target.value)} className="max-w-sm" /></div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l: any) => (
          <Card key={l.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant={l.listingType === 'RESALE' ? 'default' : 'secondary'}>{l.listingType}</Badge>
                <Badge variant={l.status === 'ACTIVE' ? 'default' : 'outline'}>{l.status}</Badge>
              </div>
              <CardTitle className="text-base mt-2">{l.unit?.project?.name} - {l.unit?.name || l.unit?.unitNo}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold">₹{(Number(l.expectedPricePaise) / 100).toLocaleString()}</p>
              {l.expectedRentPaise && <p className="text-muted-foreground">Rent: ₹{(Number(l.expectedRentPaise) / 100).toLocaleString()}/mo</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(l.id, l.status === 'ACTIVE' ? 'SOLD' : 'ACTIVE')}>
                  {l.status === 'ACTIVE' ? 'Mark Sold' : 'Reactivate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
