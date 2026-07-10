type NicheConfig = {
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
  };
  navOverrides?: {
    hideGroups?: string[];
  };
};

type NicheConfigMap = Record<string, NicheConfig>;

const configs: NicheConfigMap = {
  realestate: {
    labels: { lead: "Buyer", leads: "Buyers", contact: "Contact", conversion: "Deal" },
    features: { nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: true, reports: false },
  },
  hospitality: {
    labels: { lead: "Guest", leads: "Guests", contact: "Contact", conversion: "Booking" },
    features: { nurture: false, scoring: true, routing: false, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: true, reports: false },
  },
  healthcare: {
    labels: { lead: "Patient Inquiry", leads: "Patient Inquiries", contact: "Patient", conversion: "Appointment" },
    features: { nurture: false, scoring: true, routing: false, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: false, reports: false },
  },
  agency: {
    labels: { lead: "Prospect", leads: "Prospects", contact: "Client", conversion: "Signed Client" },
    features: { nurture: true, scoring: true, routing: true, crm: true, booking: true, tickets: true, knowledgeBase: true, media: true, qrCodes: true, reports: true },
  },
  logistics: {
    labels: { lead: "Shipper", leads: "Shippers", contact: "Contact", conversion: "Booked Shipment" },
    features: { nurture: false, scoring: true, routing: true, crm: false, booking: true, tickets: false, knowledgeBase: false, media: false, qrCodes: false, reports: false },
  },
};

const nicheName = import.meta.env.VITE_NICHE_NAME || "agency";

export function getNicheConfig(): NicheConfig {
  return configs[nicheName] || configs.agency;
}

export function getNicheName(): string {
  return nicheName;
}

export function getLabel(key: keyof NicheConfig["labels"]): string {
  return getNicheConfig().labels[key];
}

export function isFeatureEnabled(key: keyof NicheConfig["features"]): boolean {
  return getNicheConfig().features[key];
}

export default configs;
