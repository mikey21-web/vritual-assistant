import type { ExplainStep } from './explainMode';

export interface GuidedTour {
  id: string;
  title: string;
  steps: ExplainStep[];
}

export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'leads',
    title: 'Learn: Leads',
    steps: [
      { page: 'leads', filters: {}, narration: 'This is your Leads pipeline — every prospect that comes in starts here.' },
      { page: 'leads', filters: { status: 'NEW' }, narration: "NEW leads haven't been contacted yet — these need action first." },
      { page: 'leads', filters: { segment: 'HOT' }, narration: 'HOT leads are your best opportunities — follow up with these before anything else.' },
    ],
  },
  {
    id: 'tickets',
    title: 'Learn: Tickets',
    steps: [
      { page: 'tickets', filters: {}, narration: 'Support tickets from your customers land here.' },
      { page: 'tickets', filters: { status: 'OPEN' }, narration: 'OPEN tickets are unresolved — check these regularly to avoid SLA breaches.' },
    ],
  },
];
