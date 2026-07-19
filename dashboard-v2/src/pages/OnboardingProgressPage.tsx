import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const STATUS_META: Record<string, { icon: any; variant: any }> = {
  complete: { icon: CheckCircle2, variant: 'default' },
  in_progress: { icon: Circle, variant: 'secondary' },
  blocked: { icon: AlertCircle, variant: 'destructive' },
  not_started: { icon: Circle, variant: 'outline' },
};

export default function OnboardingProgressPage() {
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try { setSteps(await api('/onboarding/progress')); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  if (error) {
    return (
      <div className="p-6">
        <Card><CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load onboarding progress.</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  const completeCount = steps.filter((s) => s.status === 'complete').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <p className="text-sm text-muted-foreground">{completeCount} of {steps.length} steps complete — each is validated against real data, not self-reported</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Setup Checklist</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {steps.map((s) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.not_started;
            const Icon = meta.icon;
            return (
              <div key={s.key} className="flex items-center justify-between border-b py-3 last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${s.status === 'complete' ? 'text-emerald-600' : s.status === 'blocked' ? 'text-red-600' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
                <Badge variant={meta.variant}>{s.status.replace('_', ' ')}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
