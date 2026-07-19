import { Injectable } from '@nestjs/common';

const STATE_TAX_RULES: Record<string, { gstRate: number; stampDutyPct: number; registrationFeePct: number }> = {
  'maharashtra': { gstRate: 0.05, stampDutyPct: 5.0, registrationFeePct: 1.0 },
  'karnataka': { gstRate: 0.05, stampDutyPct: 3.0, registrationFeePct: 1.0 },
  'tamil-nadu': { gstRate: 0.05, stampDutyPct: 7.0, registrationFeePct: 1.0 },
  'telangana': { gstRate: 0.05, stampDutyPct: 4.0, registrationFeePct: 0.5 },
  'andhra-pradesh': { gstRate: 0.05, stampDutyPct: 4.0, registrationFeePct: 1.0 },
  'uttar-pradesh': { gstRate: 0.05, stampDutyPct: 7.0, registrationFeePct: 1.0 },
  'haryana': { gstRate: 0.05, stampDutyPct: 6.0, registrationFeePct: 1.0 },
  'gujarat': { gstRate: 0.05, stampDutyPct: 4.9, registrationFeePct: 1.0 },
  'rajasthan': { gstRate: 0.05, stampDutyPct: 5.0, registrationFeePct: 1.0 },
  'delhi': { gstRate: 0.05, stampDutyPct: 6.0, registrationFeePct: 1.0 },
  'west-bengal': { gstRate: 0.05, stampDutyPct: 5.0, registrationFeePct: 1.0 },
  'kerala': { gstRate: 0.05, stampDutyPct: 8.0, registrationFeePct: 1.0 },
};

@Injectable()
export class StateTaxService {
  getRules(state: string) {
    const key = state.toLowerCase().replace(/\s+/g, '-');
    return STATE_TAX_RULES[key] || null;
  }

  getAllStates() {
    return Object.keys(STATE_TAX_RULES);
  }

  computeTaxes(state: string, baseAmountPaise: number) {
    const rules = this.getRules(state);
    if (!rules) return null;
    const gst = Math.round(baseAmountPaise * rules.gstRate);
    const stampDuty = Math.round(baseAmountPaise * (rules.stampDutyPct / 100));
    const registration = Math.round(baseAmountPaise * (rules.registrationFeePct / 100));
    return { gst, stampDuty, registration, total: gst + stampDuty + registration, ...rules };
  }
}
