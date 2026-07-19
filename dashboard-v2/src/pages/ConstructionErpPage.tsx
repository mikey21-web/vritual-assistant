import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, Truck, FileText, Package } from 'lucide-react';

export default function ConstructionErpPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContract, setShowContract] = useState(false);
  const [cForm, setCForm] = useState({ vendorId: '', projectId: '', contractType: 'CONSTRUCTION', valuePaise: '', startDate: '', scopeOfWork: '' });
  const [showPO, setShowPO] = useState(false);
  const [poForm, setPoForm] = useState({ vendorContractId: '', poNumber: '', totalAmountPaise: '', description: '' });

  const load = async () => {
    try { setContracts(await api('/construction-erp/contracts')); } catch { /* noop */ }
    try { setPos(await api('/construction-erp/purchase-orders')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createContract = async () => {
    try { await api(`/construction-erp/contracts`, { method: `POST`, body: JSON.stringify(cForm) }); toast.success('Contract created'); setShowContract(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const createPO = async () => {
    try { await api(`/construction-erp/purchase-orders`, { method: `POST`, body: JSON.stringify(poForm) }); toast.success('PO created'); setShowPO(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Construction ERP Integration</h1><p className="text-sm text-muted-foreground">Vendor contracts, POs, and delivery challans</p></div>
        <div className="flex gap-2">
          <Button onClick={() => setShowContract(!showContract)}><Plus className="mr-2 h-4 w-4" /> Contract</Button>
          <Button variant="outline" onClick={() => setShowPO(!showPO)}><Plus className="mr-2 h-4 w-4" /> PO</Button>
        </div>
      </div>

      {showContract && (
        <Card><CardContent className="pt-4 space-y-3">
          <Input placeholder="Contract type" value={cForm.contractType} onChange={e => setCForm({ ...cForm, contractType: e.target.value })} />
          <Input type="number" placeholder="Value (paise)" value={cForm.valuePaise} onChange={e => setCForm({ ...cForm, valuePaise: e.target.value })} />
          <Input type="date" value={cForm.startDate} onChange={e => setCForm({ ...cForm, startDate: e.target.value })} />
          <div className="flex gap-2"><Button onClick={createContract}>Create</Button><Button variant="outline" onClick={() => setShowContract(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      {showPO && (
        <Card><CardContent className="pt-4 space-y-3">
          <Input placeholder="PO Number" value={poForm.poNumber} onChange={e => setPoForm({ ...poForm, poNumber: e.target.value })} />
          <Input type="number" placeholder="Total amount (paise)" value={poForm.totalAmountPaise} onChange={e => setPoForm({ ...poForm, totalAmountPaise: e.target.value })} />
          <div className="flex gap-2"><Button onClick={createPO}>Create</Button><Button variant="outline" onClick={() => setShowPO(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Contracts ({contracts.length})</h2>
          {contracts.map((c: any) => (
            <Card key={c.id}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">{c.contractType}</CardTitle><Badge variant="outline">{c.status || 'ACTIVE'}</Badge></div></CardHeader>
            <CardContent className="text-sm"><p>₹{(Number(c.valuePaise) / 100).toLocaleString()} · {c.vendor?.name}</p></CardContent></Card>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Purchase Orders ({pos.length})</h2>
          {pos.map((p: any) => (
            <Card key={p.id}><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">{p.poNumber}</CardTitle><Badge variant="outline">{p.status || 'PENDING'}</Badge></div></CardHeader>
            <CardContent className="text-sm"><p>₹{(Number(p.totalAmountPaise) / 100).toLocaleString()}</p></CardContent></Card>
          ))}
        </div>
      </div>
    </div>
  );
}
