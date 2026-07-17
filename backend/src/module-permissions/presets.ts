// The 5 named presets, matching Vyuha's exact grant shape — an "Apply preset" bulk-writes
// these rows, but every row stays individually editable afterward (not a locked role).
export const PERMISSION_MODULES = [
  'DASHBOARD', 'EVENTS', 'CRM', 'VENDORS', 'TEAM', 'TIMESHEET', 'ACCOUNTING', 'INVENTORY', 'PROCUREMENT',
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number];
export type PermissionLevelKey = 'NO_ACCESS' | 'VIEW_ONLY' | 'EDIT' | 'FULL_ACCESS';

export const PRESETS: Record<string, { description: string; grants: Partial<Record<PermissionModuleKey, PermissionLevelKey>> }> = {
  'Operations manager': {
    description: 'Run events, log own expenses, no financial visibility',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'FULL_ACCESS', CRM: 'VIEW_ONLY', VENDORS: 'EDIT', TEAM: 'VIEW_ONLY', TIMESHEET: 'EDIT', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'VIEW_ONLY', PROCUREMENT: 'NO_ACCESS' },
  },
  'Sales coordinator': {
    description: 'CRM + own pipeline, no financials',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'FULL_ACCESS', VENDORS: 'NO_ACCESS', TEAM: 'NO_ACCESS', TIMESHEET: 'NO_ACCESS', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'NO_ACCESS', PROCUREMENT: 'NO_ACCESS' },
  },
  'Event coordinator': {
    description: 'Full event workflow + vendors + inventory',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'FULL_ACCESS', CRM: 'FULL_ACCESS', VENDORS: 'FULL_ACCESS', TEAM: 'VIEW_ONLY', TIMESHEET: 'EDIT', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'FULL_ACCESS', PROCUREMENT: 'EDIT' },
  },
  'Finance manager': {
    description: 'Full accounting + financial visibility',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'VIEW_ONLY', VENDORS: 'VIEW_ONLY', TEAM: 'VIEW_ONLY', TIMESHEET: 'VIEW_ONLY', ACCOUNTING: 'FULL_ACCESS', INVENTORY: 'NO_ACCESS', PROCUREMENT: 'VIEW_ONLY' },
  },
  'Operations staff': {
    description: 'Inventory + read-only events',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'NO_ACCESS', VENDORS: 'NO_ACCESS', TEAM: 'NO_ACCESS', TIMESHEET: 'EDIT', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'FULL_ACCESS', PROCUREMENT: 'VIEW_ONLY' },
  },
  // Real-estate-flavored presets — same underlying module keys as above,
  // relabeled per-niche on the frontend (EVENTS→Properties, CRM→Buyers,
  // VENDORS→Channel Partners, TIMESHEET→Site Visits, ACCOUNTING→Payments &
  // Collections, INVENTORY→Unit Inventory). Kept alongside the event-mgmt
  // presets rather than replacing them since the preset list isn't niche-scoped.
  'Sales Agent': {
    description: 'Own buyers + site visits, no financials or team management',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'FULL_ACCESS', VENDORS: 'NO_ACCESS', TEAM: 'NO_ACCESS', TIMESHEET: 'FULL_ACCESS', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'VIEW_ONLY', PROCUREMENT: 'NO_ACCESS' },
  },
  'Sales Manager': {
    description: 'Full buyer/property/site-visit access, team visibility, no payments',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'FULL_ACCESS', CRM: 'FULL_ACCESS', VENDORS: 'EDIT', TEAM: 'VIEW_ONLY', TIMESHEET: 'FULL_ACCESS', ACCOUNTING: 'VIEW_ONLY', INVENTORY: 'FULL_ACCESS', PROCUREMENT: 'NO_ACCESS' },
  },
  'Marketing Coordinator': {
    description: 'Buyers + property listings, no payments or team access',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'EDIT', CRM: 'FULL_ACCESS', VENDORS: 'VIEW_ONLY', TEAM: 'NO_ACCESS', TIMESHEET: 'VIEW_ONLY', ACCOUNTING: 'NO_ACCESS', INVENTORY: 'VIEW_ONLY', PROCUREMENT: 'NO_ACCESS' },
  },
  'Finance & Payments': {
    description: 'Full payments/collections visibility, read-only everywhere else',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'VIEW_ONLY', VENDORS: 'VIEW_ONLY', TEAM: 'VIEW_ONLY', TIMESHEET: 'VIEW_ONLY', ACCOUNTING: 'FULL_ACCESS', INVENTORY: 'NO_ACCESS', PROCUREMENT: 'VIEW_ONLY' },
  },
  'Viewer': {
    description: 'Read-only across the board, no team or procurement access',
    grants: { DASHBOARD: 'VIEW_ONLY', EVENTS: 'VIEW_ONLY', CRM: 'VIEW_ONLY', VENDORS: 'VIEW_ONLY', TEAM: 'NO_ACCESS', TIMESHEET: 'VIEW_ONLY', ACCOUNTING: 'VIEW_ONLY', INVENTORY: 'VIEW_ONLY', PROCUREMENT: 'NO_ACCESS' },
  },
};
