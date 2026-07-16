export interface SchedulerFinding {
  type: 'stale_hot_leads' | 'stale_new_leads' | 'conversion_anomaly' | 'overdue_tasks' | 'lead_source_shift' | 'unassigned_hot_leads' | 'staff_performance_update';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  count: number;
  metadata: any;
}
