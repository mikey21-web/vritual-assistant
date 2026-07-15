import { isFeatureEnabled } from "../lib/niche-config";

const pageToFeature: Record<string, string> = {
  Overview: "overview",
  Leads: "leads",
  Pipeline: "pipeline",
  Contacts: "contacts",
  Campaigns: "campaigns",
  Forms: "forms",
  QRCodes: "qrCodes",
  Messages: "messages",
  Templates: "templates",
  Media: "media",
  Nurture: "nurture",
  Scoring: "scoring",
  Rules: "routing",
  AICampaigns: "aiCampaigns",
  AIAgent: "aiAgent",
  Copilot: "copilot",
  Mikey: "mikey",
  Webhooks: "webhooks",
  SMS: "sms",
  Widget: "widget",
  Calls: "calls",
  SyncLogs: "syncLogs",
  Tasks: "tasks",
  Conversions: "conversions",
  Events: "events",
  EventDetail: "events",
  CreateEvent: "events",
  EventCalendar: "events",
  Accounting: "finance",
  Invoices: "finance",
  Quotations: "finance",
  Contracts: "finance",
  FinanceReports: "finance",
  Partners: "procurement",
  VendorBookings: "procurement",
  PurchaseOrders: "procurement",
  InventoryItems: "inventory",
  StockMovements: "inventory",
  Locations: "inventory",
  Team: "teamHr",
  LeaveLog: "teamHr",
  Salaries: "teamHr",
  Timesheet: "teamHr",
  Integrations: "integrations",
  CRM: "crm",
  Booking: "booking",
  Tickets: "tickets",
  KnowledgeBase: "knowledgeBase",
  Analytics: "analytics",
  Reports: "reports",
  Studio: "studio",
  Settings: "settings",
  Import: "import",
  AdIntegrations: "adIntegrations",
  WebsiteCrawler: "websiteCrawler",
  PublicProfile: "publicProfile",
  Properties: "properties",
  Shipments: "shipments",
};

export function FeatureGuard({ pageKey, children }: { pageKey: string; children: React.ReactNode }) {
  const feature = pageToFeature[pageKey];
  if (feature && !isFeatureEnabled(feature as any)) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">
        Page not found
      </div>
    );
  }
  return <>{children}</>;
}
