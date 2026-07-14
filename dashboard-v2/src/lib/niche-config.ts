export type NicheConfig = {
  businessName: string;
  primaryColor: string;
  labels: {
    lead: string;
    leads: string;
    contact: string;
    conversion: string;
  };
  features: {
    nurture: boolean;
    scoring: boolean;
    routing: boolean;
    crm: boolean;
    booking: boolean;
    tickets: boolean;
    knowledgeBase: boolean;
    media: boolean;
    qrCodes: boolean;
    reports: boolean;
    campaigns: boolean;
    forms: boolean;
    messages: boolean;
    templates: boolean;
    aiCampaigns: boolean;
    aiAgent: boolean;
    copilot: boolean;
    webhooks: boolean;
    sms: boolean;
    widget: boolean;
    tasks: boolean;
    integrations: boolean;
    analytics: boolean;
    studio: boolean;
    events: boolean;
    finance: boolean;
    procurement: boolean;
    inventory: boolean;
    teamHr: boolean;
    publicProfile: boolean;
    overview: boolean;
    leads: boolean;
    pipeline: boolean;
    contacts: boolean;
    calls: boolean;
    syncLogs: boolean;
    conversions: boolean;
    settings: boolean;
    import: boolean;
    adIntegrations: boolean;
    websiteCrawler: boolean;
    properties: boolean;
    shipments: boolean;
  };
};

const realestate: NicheConfig = {
  businessName: "Acme Realty", primaryColor: "#0B5B7A",
  labels: { lead: "Buyer", leads: "Buyers", contact: "Contact", conversion: "Deal" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: true, websiteCrawler: true, nurture: false, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: true, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: false, finance: true, procurement: false, inventory: false, teamHr: false, publicProfile: true, properties: true, shipments: false },
};

const hospitality: NicheConfig = {
  businessName: "StayWell Hotels", primaryColor: "#0E7C7B",
  labels: { lead: "Guest", leads: "Guests", contact: "Contact", conversion: "Booking" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: false, websiteCrawler: true, nurture: true, scoring: true, routing: false, crm: true, booking: true, tickets: false, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: true, webhooks: false, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: false, finance: false, procurement: false, inventory: false, teamHr: false, publicProfile: true, properties: false, shipments: false },
};

const healthcare: NicheConfig = {
  businessName: "CarePlus Clinic", primaryColor: "#2563EB",
  labels: { lead: "Patient Inquiry", leads: "Patient Inquiries", contact: "Patient", conversion: "Appointment" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: false, websiteCrawler: true, nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: true, media: false, qrCodes: false, reports: true, campaigns: false, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: true, webhooks: false, sms: true, widget: true, tasks: true, integrations: false, analytics: true, studio: false, events: false, finance: false, procurement: false, inventory: false, teamHr: true, publicProfile: true, properties: false, shipments: false },
};

const agency: NicheConfig = {
  businessName: "GrowthEdge Marketing", primaryColor: "#DB2777",
  labels: { lead: "Prospect", leads: "Prospects", contact: "Client", conversion: "Signed Client" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: true, websiteCrawler: true, nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: true, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: true, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: true, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true, properties: false, shipments: false },
};

const logistics: NicheConfig = {
  businessName: "SwiftFreight Logistics", primaryColor: "#EA580C",
  labels: { lead: "Shipper", leads: "Shippers", contact: "Contact", conversion: "Shipment" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: false, websiteCrawler: true, nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: false, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: true, webhooks: true, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: false, finance: false, procurement: true, inventory: false, teamHr: false, publicProfile: true, properties: false, shipments: true },
};

const eventMarketing: NicheConfig = {
  businessName: "EventPro Marketing", primaryColor: "#0E9D6E",
  labels: { lead: "Client", leads: "Clients", contact: "Contact", conversion: "Booking" },
  features: { overview: true, leads: true, pipeline: true, contacts: true, calls: true, syncLogs: true, conversions: true, settings: true, import: true, adIntegrations: false, websiteCrawler: true, nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: false, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true, properties: false, shipments: false },
};

const nicheMap: Record<string, NicheConfig> = {
  realestate,
  hospitality,
  healthcare,
  logistics,
  "event-marketing-agency": eventMarketing,
  agency,
};

const envNiche = import.meta.env.VITE_NICHE_NAME || "agency";
let currentConfig: NicheConfig = nicheMap[envNiche] || agency;

const industryToNiche: Record<string, string> = {
  "real-estate": "realestate",
  "real estate": "realestate",
  hospitality: "hospitality",
  hotel: "hospitality",
  healthcare: "healthcare",
  clinic: "healthcare",
  logistics: "logistics",
  transport: "logistics",
  events: "event-marketing-agency",
  wedding: "event-marketing-agency",
  "event planning": "event-marketing-agency",
  agency: "agency",
  marketing: "agency",
};

export async function initNicheConfig(): Promise<void> {
  try {
    const res = await fetch("/api/business-settings");
    if (!res.ok) throw new Error("Failed to fetch settings");
    const settings = await res.json();
    const industry = settings?.industry?.toLowerCase().trim();
    if (industry && industryToNiche[industry]) {
      currentConfig = { ...nicheMap[industryToNiche[industry]] };
      if (settings?.businessName) currentConfig.businessName = settings.businessName;
    }
  } catch {
    // fallback to env var
  }
}

export function getNicheName(): string {
  return Object.entries(nicheMap).find(([, c]) => c === currentConfig)?.[0] || envNiche;
}

export function getBusinessName(): string {
  return currentConfig.businessName;
}

export function getPrimaryColor(): string {
  return currentConfig.primaryColor;
}

export function getLabel(key: keyof NicheConfig["labels"]): string {
  return currentConfig.labels[key];
}

export function isFeatureEnabled(key: keyof NicheConfig["features"]): boolean {
  return currentConfig.features[key];
}
