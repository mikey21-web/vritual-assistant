import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

export default function DigitalSalesRoomPage() {
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try { setFunnel(await api('/buyer-checkout/funnel')); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  if (error) {
    return (
      <div className="p-6">
        <Card><CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load the digital sales room funnel.</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const rows = [
    { label: 'Browsing sessions', value: funnel?.sessions ?? 0 },
    { label: 'Units shortlisted', value: funnel?.shortlisted ?? 0 },
    { label: 'Checkout holds created', value: funnel?.holdsCreated ?? 0 },
    { label: 'Checkout attempts started', value: funnel?.attemptsStarted ?? 0 },
    { label: 'Payments confirmed', value: funnel?.paymentsConfirmed ?? 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Digital Sales Room</h1>
        <p className="text-sm text-muted-foreground">Public buyer checkout funnel — browse, shortlist, hold, pay, book</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="text-lg font-semibold">{r.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Online checkout uses a real Razorpay order when a tenant has payment credentials configured. Without configured credentials, checkout holds and shortlists still work, but payment intents are created in a <span className="font-medium">not-configured</span> state — no payment is ever faked as successful.
        </CardContent>
      </Card>
    </div>
  );
}
