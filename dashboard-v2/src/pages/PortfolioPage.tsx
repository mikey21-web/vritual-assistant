import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';

export default function PortfolioPage() {
  const [overview, setOverview] = useState<any>(null);
  const [cashPos, setCashPos] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/portfolio/overview').catch(() => null),
      api('/portfolio/cash-position').catch(() => null),
    ]).then(([o, c]) => { setOverview(o); setCashPos(c); setLoading(false); });
  }, []);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
      <p className="text-sm text-muted-foreground">Multi-entity view across all projects</p>

      {/* KPI Cards */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Projects</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{overview.totalProjects}</p><p className="text-xs text-muted-foreground">{overview.activeProjects} active</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Units</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{overview.totalUnits}</p><p className="text-xs text-muted-foreground">{overview.soldUnits} sold</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inventory</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{overview.totalInventory}</p><p className="text-xs text-muted-foreground">Available units</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Leads</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{overview.pipeline?.leads}</p><p className="text-xs text-muted-foreground">{overview.pipeline?.bookings} converted</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Collections</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{(Number(overview.totalCollectionsPaise) / 100).toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cash Position</CardTitle></CardHeader><CardContent>{cashPos && <><p className="text-lg font-bold text-emerald-600">₹{(Number(cashPos.totalCollectedPaise) / 100).toLocaleString()}</p><p className="text-xs text-muted-foreground">Due: ₹{(Number(cashPos.totalDuePaise) / 100).toLocaleString()}</p></>}</CardContent></Card>
        </div>
      )}

      {/* Entities */}
      <Card>
        <CardHeader><CardTitle>Project Entities</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Type</th></tr></thead><tbody>
            {overview?.entitySummary?.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0"><td className="py-2">{p.name}</td><td className="py-2">{p.status}</td><td className="py-2">{p.type}</td></tr>
            ))}
          </tbody></table></div>
        </CardContent>
      </Card>
    </div>
  );
}
