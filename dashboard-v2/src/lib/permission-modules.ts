// Must exactly match the backend's PermissionModule enum (module-permissions
// presets.ts) — PROPERTIES/PROJECTS were listed here before but don't exist
// in that enum, so toggling them silently 400'd. Real-estate display labels
// come from niche-config's permissionModuleLabels (EVENTS->Properties,
// CRM->Buyers, VENDORS->Channel Partners, TIMESHEET->Site Visits,
// ACCOUNTING->Payments & Collections, INVENTORY->Unit Inventory).
export const PERMISSION_MODULES = ['DASHBOARD', 'EVENTS', 'CRM', 'VENDORS', 'TEAM', 'TIMESHEET', 'ACCOUNTING', 'INVENTORY', 'PROCUREMENT'];
export const PERMISSION_LEVELS = ['NO_ACCESS', 'VIEW_ONLY', 'EDIT', 'FULL_ACCESS'];

export const PERMISSION_LEVEL_LABELS: Record<string, string> = {
  NO_ACCESS: 'No access',
  VIEW_ONLY: 'View only',
  EDIT: 'Edit',
  FULL_ACCESS: 'Full access',
};
