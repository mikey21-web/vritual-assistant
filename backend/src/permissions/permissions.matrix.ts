export const PERMISSION_MATRIX: Record<string, string[]> = {
  // Tenant / super admin
  'tenants:read':        ['OWNER', 'ADMIN'],
  'tenants:write':       ['OWNER'],
  'tenants:delete':      ['OWNER'],

  // Users
  'users:read':          ['OWNER', 'ADMIN', 'MANAGER'],
  'users:write':         ['OWNER', 'ADMIN'],
  'users:delete':        ['OWNER', 'ADMIN'],
  'users:read_self':     ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],

  // Leads
  'leads:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'leads:write':         ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'leads:delete':        ['OWNER', 'ADMIN', 'MANAGER'],
  'leads:assign':        ['OWNER', 'ADMIN', 'MANAGER'],
  'leads:export':        ['OWNER', 'ADMIN', 'MANAGER'],

  // Contacts
  'contacts:read':       ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'contacts:write':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'contacts:delete':     ['OWNER', 'ADMIN', 'MANAGER'],
  'contacts:merge':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Campaigns
  'campaigns:read':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'campaigns:write':     ['OWNER', 'ADMIN', 'MANAGER'],
  'campaigns:delete':    ['OWNER', 'ADMIN'],

  // Conversations
  'conversations:read':  ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'conversations:write': ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'],

  // Templates
  'templates:read':      ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'templates:write':     ['OWNER', 'ADMIN', 'MANAGER'],
  'templates:delete':    ['OWNER', 'ADMIN'],

  // Nurture
  'nurture:read':        ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'nurture:write':       ['OWNER', 'ADMIN', 'MANAGER'],
  'nurture:delete':      ['OWNER', 'ADMIN'],

  // Scoring rules
  'scoring:read':        ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'scoring:write':       ['OWNER', 'ADMIN', 'MANAGER'],

  // Routing rules
  'routing:read':        ['OWNER', 'ADMIN', 'MANAGER'],
  'routing:write':       ['OWNER', 'ADMIN', 'MANAGER'],

  // Automation rules
  'rules:read':          ['OWNER', 'ADMIN', 'MANAGER'],
  'rules:write':         ['OWNER', 'ADMIN'],
  'rules:test':          ['OWNER', 'ADMIN', 'MANAGER'],

  // Integrations
  'integrations:read':   ['OWNER', 'ADMIN'],
  'integrations:write':  ['OWNER', 'ADMIN'],
  'integrations:test':   ['OWNER', 'ADMIN'],

  // CRM mappings
  'crm_mappings:read':   ['OWNER', 'ADMIN', 'MANAGER'],
  'crm_mappings:write':  ['OWNER', 'ADMIN'],

  // Booking
  'booking:read':        ['OWNER', 'ADMIN', 'MANAGER'],
  'booking:write':       ['OWNER', 'ADMIN'],

  // Analytics
  'analytics:read':      ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],

  // Audit logs
  'audit_logs:read':     ['OWNER', 'ADMIN'],

  // System events
  'events:read':         ['OWNER', 'ADMIN'],

  // Failures
  'failures:read':       ['OWNER', 'ADMIN', 'MANAGER'],
  'failures:retry':      ['OWNER', 'ADMIN', 'MANAGER'],
  'failures:resolve':    ['OWNER', 'ADMIN', 'MANAGER'],

  // Timeline
  'timeline:read':       ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT'],

  // Tasks
  'tasks:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'tasks:write':         ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],

  // Conversions
  'conversions:read':    ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'],
  'conversions:write':   ['OWNER', 'ADMIN', 'MANAGER'],

  // Media
  'media:read':          ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'SUPPORT_AGENT', 'VIEWER'],
  'media:upload':        ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
  'media:delete':        ['OWNER', 'ADMIN', 'MANAGER'],

  // Forms
  'forms:read':          ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'forms:write':         ['OWNER', 'ADMIN', 'MANAGER'],

  // QR codes
  'qr_codes:read':       ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'qr_codes:write':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Custom fields
  'custom_fields:read':  ['OWNER', 'ADMIN', 'MANAGER'],
  'custom_fields:write': ['OWNER', 'ADMIN'],

  // Business settings
  'settings:read':       ['OWNER', 'ADMIN'],
  'settings:write':      ['OWNER', 'ADMIN'],

  // Advanced features (SLA, pipeline, blocklist, import/export)
  'advanced:read':       ['OWNER', 'ADMIN', 'MANAGER'],
  'advanced:write':      ['OWNER', 'ADMIN', 'MANAGER'],

  // Health (admin only)
  'health:deep':         ['OWNER', 'ADMIN'],

  // Niche templates
  'niche_templates:read':  ['OWNER', 'ADMIN'],
  'niche_templates:write': ['OWNER'],
};
