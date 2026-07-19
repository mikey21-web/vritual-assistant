import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

export default function LaunchControlPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try { setStatus(await api('/launch-control/status')); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  if (error) {
    return (
      <div className="p-6">
        <Card><CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load launch control status.</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const cards = [
    { label: 'New leads (15 min)', value: status.newLeadsLast15Min },
    { label: 'Open SLA breaches', value: status.openSlaBreaches, warn: status.openSlaBreaches > 0 },
    { label: 'Agents available', value: `${status.agentsAvailable}/${status.agentsTotal}` },
    { label: 'Site visits today', value: status.visitsToday },
    { label: 'Active checkout holds', value: status.checkoutHoldsActive },
    { label: 'Payments pending', value: status.paymentsPending },
    { label: 'Units released today', value: status.unitsReleasedToday },
    { label: 'Units booked today', value: status.unitsBookedToday },
    { label: 'Connector failures today', value: status.recentIntegrationFailures, warn: status.recentIntegrationFailures > 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Launch Control</h1><p className="text-sm text-muted-foreground">Live view for launch-day spikes — refreshes every 30s</p></div>
        <Button variant="outline" onClick={load}>Refresh now</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{c.label}</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${c.warn ? 'text-red-600' : ''}`}>{c.value}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming Release Batches</CardTitle></CardHeader>
        <CardContent>
          {(!status.upcomingReleaseBatches || status.upcomingReleaseBatches.length === 0) ? (
            <p className="text-sm text-muted-foreground">No planned release batches.</p>
          ) : (
            <div className="space-y-2">
              {status.upcomingReleaseBatches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div><p className="text-sm font-medium">{b.name}</p><p className="text-xs text-muted-foreground">{b.unitIds?.length ?? 0} units</p></div>
                  <Badge variant="outline">{new Date(b.releaseAt).toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
