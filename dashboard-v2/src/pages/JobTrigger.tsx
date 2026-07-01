import { useState } from 'react';
import { api } from '../lib/api';
import PageHeader from '../components/PageHeader';
import { toast } from 'sonner';

export default function JobTrigger() {
  const [busy, setBusy] = useState<string | null>(null);

  async function runJob(name: string, endpoint: string, payload?: any) {
    setBusy(name);
    try {
      const result = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      toast.success(`${name} complete`);
      return result;
    } catch (err: any) {
      toast.error(`${name} failed: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  const jobs = [
    { name: 'Drain Outbox', endpoint: '/admin/drain', description: 'Send pending outbox messages' },
    { name: 'Prune Old Data', endpoint: '/admin/prune', description: 'Clean up old records (>90 days)' },
    { name: 'Retry Failed Outbox', endpoint: '/admin/retry-outbox', description: 'Re-drain failed messages' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Manual Job Trigger" description="Run background jobs on demand" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.map(job => (
          <div key={job.name} className="border rounded-lg p-4">
            <h3 className="font-semibold">{job.name}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{job.description}</p>
            <button
              onClick={() => runJob(job.name, job.endpoint)}
              disabled={busy === job.name}
              className="mt-3 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {busy === job.name ? 'Running...' : 'Run now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
