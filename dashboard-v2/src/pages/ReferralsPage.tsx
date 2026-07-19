import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import toast from 'react-hot-toast';
import { Plus, Gift, Trophy } from 'lucide-react';

export default function ReferralsPage() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', programType: 'LEAD', rewardType: 'CASH', rewardValuePaise: '', startAt: '', endAt: '', tldr: '', rules: '' });

  const load = async () => {
    try { setPrograms(await api('/referrals/programs')); } catch { /* noop */ }
    try { setAnalytics(await api('/referrals/analytics')); } catch { /* noop */ }
    try { setLeaderboard(await api('/referrals/leaderboard')); } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try { await api(`/referrals/programs`, { method: `POST`, body: JSON.stringify(form) }); toast.success('Program created'); setShowCreate(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Referral & Loyalty Programs</h1><p className="text-sm text-muted-foreground">Drive referrals and reward loyal partners</p></div>
        <Button onClick={() => setShowCreate(!showCreate)}><Plus className="mr-2 h-4 w-4" /> New Program</Button>
      </div>

      {showCreate && (
        <Card><CardContent className="pt-4 space-y-3">
          <Input placeholder="Program name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.programType} onChange={e => setForm({ ...form, programType: e.target.value })}>
            <option value="LEAD">Lead Referral</option><option value="BOOKING">Booking Referral</option><option value="LOYALTY">Loyalty Points</option>
          </select>
          <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.rewardType} onChange={e => setForm({ ...form, rewardType: e.target.value })}>
            <option value="CASH">Cash</option><option value="DISCOUNT">Discount</option><option value="POINTS">Points</option><option value="GIFT">Gift</option>
          </select>
          <Input type="number" placeholder="Reward value (paise)" value={form.rewardValuePaise} onChange={e => setForm({ ...form, rewardValuePaise: e.target.value })} />
          <Input type="date" value={form.startAt} onChange={e => setForm({ ...form, startAt: e.target.value })} />
          <div className="flex gap-2"><Button onClick={create}>Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
        </CardContent></Card>
      )}

      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Referrals</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.total}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Conversion Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{analytics.conversionRate}%</p></CardContent></Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Programs</h2>
          {programs.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Badge variant={p.status === 'ACTIVE' ? 'default' : 'outline'}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm"><p className="text-muted-foreground">{p.tldr || `${p._count?.referrals || 0} referrals`}</p></CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4" /> Leaderboard</h2>
          {leaderboard.map((l: any, i: number) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between py-3">
                <div><p className="font-medium">{l.referrerName}</p><p className="text-xs text-muted-foreground">{l.referrerPhone}</p></div>
                <Badge>{l.conversions} conversions</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
