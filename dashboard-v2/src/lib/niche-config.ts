type NicheConfig = {
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
  };
};

const realestate: NicheConfig = {
  businessName: "Acme Realty", primaryColor: "#0B5B7A",
  labels: { lead: "Buyer", leads: "Buyers", contact: "Contact", conversion: "Deal" },
  features: { nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: true, reports: false, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: true, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: true, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true },
};

const hospitality: NicheConfig = {
  businessName: "StayWell Hotels", primaryColor: "#0E7C7B",
  labels: { lead: "Guest", leads: "Guests", contact: "Contact", conversion: "Booking" },
  features: { nurture: false, scoring: true, routing: false, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: true, reports: false, campaigns: false, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: false, webhooks: false, sms: false, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true },
};

const healthcare: NicheConfig = {
  businessName: "CarePlus Clinic", primaryColor: "#2563EB",
  labels: { lead: "Patient Inquiry", leads: "Patient Inquiries", contact: "Patient", conversion: "Appointment" },
  features: { nurture: false, scoring: true, routing: false, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: false, reports: false, campaigns: false, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: false, webhooks: false, sms: false, widget: true, tasks: true, integrations: false, analytics: false, studio: false, events: false, finance: true, procurement: false, inventory: true, teamHr: true, publicProfile: true },
};

const agency: NicheConfig = {
  businessName: "GrowthEdge Marketing", primaryColor: "#DB2777",
  labels: { lead: "Prospect", leads: "Prospects", contact: "Client", conversion: "Signed Client" },
  features: { nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: true, knowledgeBase: true, media: true, qrCodes: true, reports: true, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: true, sms: true, widget: true, tasks: true, integrations: true, analytics: true, studio: true, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true },
};

const logistics: NicheConfig = {
  businessName: "SwiftFreight Logistics", primaryColor: "#EA580C",
  labels: { lead: "Shipper", leads: "Shippers", contact: "Contact", conversion: "Booked Shipment" },
  features: { nurture: false, scoring: true, routing: true, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: false, reports: false, campaigns: false, forms: true, messages: true, templates: true, aiCampaigns: false, aiAgent: true, copilot: false, webhooks: true, sms: false, widget: true, tasks: true, integrations: true, analytics: false, studio: false, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true },
};

const eventMarketing: NicheConfig = {
  businessName: "EventPro Marketing", primaryColor: "#0E9D6E",
  labels: { lead: "Client", leads: "Clients", contact: "Contact", conversion: "Booking" },
  features: { nurture: true, scoring: true, routing: false, crm: true, booking: true, tickets: false, knowledgeBase: false, media: true, qrCodes: true, reports: false, campaigns: true, forms: true, messages: true, templates: true, aiCampaigns: true, aiAgent: true, copilot: true, webhooks: false, sms: false, widget: true, tasks: true, integrations: true, analytics: true, studio: false, events: true, finance: true, procurement: true, inventory: true, teamHr: true, publicProfile: true },
};

const nicheName = import.meta.env.VITE_NICHE_NAME || "agency";

const config: NicheConfig =
  nicheName === "realestate" ? realestate :
  nicheName === "hospitality" ? hospitality :
  nicheName === "healthcare" ? healthcare :
  nicheName === "logistics" ? logistics :
  nicheName === "event-marketing-agency" ? eventMarketing :
  agency;

export function getNicheName(): string {
  return nicheName;
}

export function getBusinessName(): string {
  return config.businessName;
}

export function getPrimaryColor(): string {
  return config.primaryColor;
}

export function getLabel(key: keyof NicheConfig["labels"]): string {
  return config.labels[key];
}

export function isFeatureEnabled(key: keyof NicheConfig["features"]): boolean {
  return config.features[key];
}
