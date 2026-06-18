// Shared utility: creates a full-depth niche template
const createTemplate = (
  key: string, name: string, desc: string, industry: string,
  fields: any[], forms: any[], campaigns: any[], stages: any[],
  scoring: any[], routing: any[], messages: any[], sequences: any[],
  booking: any[], crmMappings: any[], conversions: any[], reports: any[],
  automationRules: any[], labels: any,
) => ({
  key, name, description: desc, industry, version: 1,
  packs: {
    customFields: { type: 'custom_fields', name: `${name} Fields`, order: 1, payload: { fields } },
    lead_forms: { type: 'lead_forms', name: `${name} Forms`, order: 2, payload: { forms } },
    campaigns: { type: 'campaigns', name: `${name} Campaigns`, order: 3, payload: { campaigns } },
    pipeline_stages: { type: 'pipeline_stages', name: `${name} Pipeline`, order: 4, payload: { stages } },
    scoring_rules: { type: 'scoring_rules', name: `${name} Scoring`, order: 5, payload: { rules: scoring } },
    routing_rules: { type: 'routing_rules', name: `${name} Routing`, order: 6, payload: { rules: routing } },
    message_templates: { type: 'message_templates', name: `${name} Messages`, order: 7, payload: { templates: messages } },
    nurture_sequences: { type: 'nurture_sequences', name: `${name} Nurture`, order: 8, payload: { sequences } },
    booking_settings: { type: 'booking_settings', name: `${name} Booking`, order: 9, payload: { settings: booking } },
    crm_mappings: { type: 'crm_mappings', name: `${name} CRM`, order: 10, payload: { mappings: crmMappings } },
    conversion_goals: { type: 'conversion_goals', name: `${name} Conversions`, order: 11, payload: { goals: conversions } },
    reports: { type: 'reports', name: `${name} Reports`, order: 12, payload: { reports } },
    automation_rules: { type: 'automation_rules', name: `${name} Automations`, order: 13, payload: { rules: automationRules } },
    dashboard_labels: { type: 'dashboard_labels', name: `${name} Labels`, order: 14, payload: { labels } },
  },
});

// ===================================================================
// 1. EDUCATION & COACHING
// ===================================================================
export const educationCoachingTemplate = createTemplate(
  'education-coaching', 'Education & Coaching',
  'Lead capture for education institutes, coaching centers, and online course providers. Tracks course interest, student age, batch preference, enrollment timeline, and demo attendance.',
  'education',
  [
    { name: 'Course Interest', key: 'course_interest', type: 'DROPDOWN', target: 'LEAD', options: ['JEE','NEET','UPSC','CAT','IELTS','Coding','Data Science','MBA Prep','School Tuition','Other'], required: true, displayOrder: 1 },
    { name: 'Student Age', key: 'student_age', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 2 },
    { name: 'Current Education', key: 'education_level', type: 'DROPDOWN', target: 'LEAD', options: ['School','College','Graduate','Working Professional'], required: false, displayOrder: 3 },
    { name: 'Target Exam', key: 'target_exam', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 4 },
    { name: 'Preferred Batch', key: 'preferred_batch', type: 'DROPDOWN', target: 'LEAD', options: ['Morning','Afternoon','Evening','Weekend','Online Only'], required: false, displayOrder: 5 },
    { name: 'Parent Contact', key: 'parent_name', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Parent Phone', key: 'parent_phone', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Budget', key: 'budget', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 8 },
    { name: 'Enrollment Timeline', key: 'enrollment_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','This Month','Next Month','Next Quarter'], required: false, displayOrder: 9 },
    { name: 'Referral Source', key: 'referral_source', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 10 },
  ],
  [
    { name: 'Course Inquiry Form', active: true, fields: [{ label: 'Student Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Course Interest', fieldKey: 'course_interest', type: 'dropdown', required: true },{ label: 'Preferred Batch', fieldKey: 'preferred_batch', type: 'dropdown', required: false }] },
    { name: 'Demo Class Registration', active: true, fields: [{ label: 'Student Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Course', fieldKey: 'course_interest', type: 'dropdown', required: true },{ label: 'Preferred Date', fieldKey: 'preferred_date', type: 'date', required: true },{ label: 'Parent Name', fieldKey: 'parent_name', type: 'text', required: false }] },
    { name: 'Scholarship Application', active: true, fields: [{ label: 'Student Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Course', fieldKey: 'course_interest', type: 'dropdown', required: true },{ label: 'Academic Score (%)', fieldKey: 'academic_score', type: 'number', required: true },{ label: 'Why You Deserve It', fieldKey: 'message', type: 'text', required: true }] },
  ],
  [
    { name: 'New Batch Announcement', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Demo Booked' },
    { name: 'Free Demo Class Campaign', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Demo Booked' },
    { name: 'Exam Prep Workshop', sourceType: 'FORM', active: true, conversionGoal: 'Enrollment' },
    { name: 'Scholarship Test Campaign', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Enrollment' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Demo Scheduled', order: 3, color: '#8b5cf6' },
    { name: 'Demo Attended', order: 4, color: '#a78bfa' },
    { name: 'Counseling Done', order: 5, color: '#10b981' },
    { name: 'Trial Started', order: 6, color: '#f59e0b' },
    { name: 'Enrolled', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Not Interested', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Immediate enrollment', field: 'enrollment_timeline', operator: 'equals', value: 'Immediate', points: 25, active: true },
    { name: 'Working professional (self-paying)', field: 'education_level', operator: 'equals', value: 'Working Professional', points: 15, active: true },
    { name: 'Parent contact available', field: 'parent_phone', operator: 'exists', value: '', points: 10, active: true },
    { name: 'High-value course (Coding/Data)', field: 'course_interest', operator: 'contains', value: 'Coding', points: 10, active: true },
    { name: 'Online only (lower conversion)', field: 'preferred_batch', operator: 'equals', value: 'Online Only', points: -5, active: true },
  ],
  [
    { name: 'Data Science → Senior Counselor', conditions: { course_interest: 'Data Science' }, action: { assign_to_role: 'MANAGER', priority: 'high' } },
    { name: 'School Student → Parent routing', conditions: { education_level: 'School' }, action: { tag: 'parent_followup' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! 👋 Welcome to {{business.name}}. We noticed your interest in {{customFields.course_interest}}. Would you like to attend a free demo class? 📚', active: true },
    { name: 'Demo Class Invite', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your demo class for {{customFields.course_interest}} is ready! Book your slot: {{booking.link}} 🎓', active: true },
    { name: 'Demo Reminder (24h)', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, just a reminder — your demo class is tomorrow! Here is the link again: {{booking.link}} ⏰', active: true },
    { name: 'Post-Demo Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, hope you enjoyed the demo! Ready to enroll? We have a limited-time offer for this batch. 💪', active: true },
    { name: 'Scholarship Result', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your scholarship test results are out! You have been offered {{scholarship.discount}}% off. Enroll before {{scholarship.deadline}} to claim!', active: true },
  ],
  [
    { name: 'New Inquiry Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Demo Class Invite' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 172800 },
      { type: 'SEND_WHATSAPP', displayOrder: 5, config: { template: 'Post-Demo Follow-up' }, waitSeconds: 0 },
    ]},
    { name: 'Abandoned Cart Reconnect', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Scholarship Result' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 604800 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Post-Demo Follow-up' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Demo Class Booking', provider: 'calendly', config: { duration: 30, title: 'Free Demo Class - {{customFields.course_interest}}' } },
    { name: 'Career Counseling Call', provider: 'calendly', config: { duration: 45, title: 'Career Counseling Session' } },
  ],
  [
    { name: 'Standard Student Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.course_interest': 'course_of_interest__c', 'customFields.education_level': 'education_level__c', 'customFields.enrollment_timeline': 'enrollment_timeline__c', source: 'lead_source__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Demo Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Counseling Requested' },
    { destination: 'PURCHASE_ONLINE', name: 'Enrollment Completed' },
    { destination: 'MEMBER_REGISTRATION', name: 'Trial Activated' },
  ],
  [
    { name: 'Leads by Course', type: 'leads_by_custom_field', config: { field: 'course_interest' } },
    { name: 'Demo to Enrollment Conversion', type: 'conversion_funnel', config: { stages: ['Demo Scheduled','Demo Attended','Enrolled'] } },
    { name: 'Revenue by Batch', type: 'revenue_summary' },
    { name: 'Hot Leads Needing Follow-up', type: 'hot_leads' },
  ],
  [
    { name: 'Auto-assign hot leads to senior counselor', category: 'automation', eventType: 'LEAD_HOT', priority: 100, conditions: {}, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Notify team on new demo booking', category: 'notification', eventType: 'APPOINTMENT_BOOKED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
    { name: 'Send demo reminder 1h before', category: 'automation', eventType: 'APPOINTMENT_BOOKED', priority: 90, conditions: {}, actions: [{ type: 'SCHEDULE_REMINDER', params: { minutesBefore: 60, templateKey: 'Demo Reminder (24h)' } }], active: true },
  ],
  { lead: 'Student Lead', leads: 'Student Leads', campaign: 'Course Campaign', campaigns: 'Course Campaigns', conversion: 'Enrollment', pipeline: 'Admission Pipeline', booking: 'Demo Class' }
);

// ===================================================================
// 2. HEALTHCARE CLINIC
// ===================================================================
export const healthcareClinicTemplate = createTemplate(
  'healthcare-clinic', 'Healthcare Clinic',
  'Lead capture for high-value healthcare clinics — dental, dermatology, fertility, cosmetic. Tracks treatment interest, urgency, insurance status, and consultation booking with HIPAA-aware messaging.',
  'healthcare',
  [
    { name: 'Treatment Interest', key: 'treatment_interest', type: 'DROPDOWN', target: 'LEAD', options: ['Dental','Dermatology','Orthopedic','Cardiology','Fertility','Cosmetic','Wellness','Checkup','Other'], required: true, displayOrder: 1 },
    { name: 'Symptoms / Concern', key: 'symptoms', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 2 },
    { name: 'Preferred Date', key: 'preferred_date', type: 'DATE', target: 'LEAD', required: false, displayOrder: 3 },
    { name: 'Urgency', key: 'urgency', type: 'DROPDOWN', target: 'LEAD', options: ['Emergency','Urgent','Routine','Exploratory'], required: true, displayOrder: 4 },
    { name: 'Insurance Status', key: 'insurance', type: 'DROPDOWN', target: 'LEAD', options: ['Insured','Self-Pay','Corporate','Not Sure'], required: false, displayOrder: 5 },
    { name: 'Insurance Provider', key: 'insurance_provider', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Referral Doctor', key: 'referral_doctor', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Preferred Doctor', key: 'preferred_doctor', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 8 },
  ],
  [
    { name: 'Appointment Request', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Treatment', fieldKey: 'treatment_interest', type: 'dropdown', required: true },{ label: 'Preferred Date', fieldKey: 'preferred_date', type: 'date', required: false },{ label: 'Urgency', fieldKey: 'urgency', type: 'dropdown', required: true }] },
    { name: 'Insurance Verification', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Date of Birth', fieldKey: 'dob', type: 'date', required: true },{ label: 'Insurance Provider', fieldKey: 'insurance_provider', type: 'text', required: true },{ label: 'Policy Number', fieldKey: 'policy_number', type: 'text', required: true }] },
    { name: 'Second Opinion Request', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Treatment Area', fieldKey: 'treatment_interest', type: 'dropdown', required: true },{ label: 'Describe Your Case', fieldKey: 'message', type: 'text', required: true }] },
  ],
  [
    { name: 'Wellness Campaign', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Seasonal Checkup Drive', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Referral Reward Program', sourceType: 'FORM', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'New Patient Offer', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Consultation Booked' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Consultation Booked', order: 3, color: '#8b5cf6' },
    { name: 'Consultation Done', order: 4, color: '#10b981' },
    { name: 'Treatment Plan Shared', order: 5, color: '#f59e0b' },
    { name: 'Treatment Started', order: 6, color: '#22c55e', isEnd: true },
    { name: 'Not Pursued', order: 7, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Emergency inquiry', field: 'urgency', operator: 'equals', value: 'Emergency', points: 35, active: true },
    { name: 'Insured patient', field: 'insurance', operator: 'equals', value: 'Insured', points: 15, active: true },
    { name: 'Referral doctor present', field: 'referral_doctor', operator: 'exists', value: '', points: 10, active: true },
    { name: 'Cosmetic treatment (self-pay, high value)', field: 'treatment_interest', operator: 'equals', value: 'Cosmetic', points: 20, active: true },
    { name: 'Exploratory only', field: 'urgency', operator: 'equals', value: 'Exploratory', points: -5, active: true },
  ],
  [
    { name: 'Emergency → Fast-track', conditions: { urgency: 'Emergency' }, action: { assign_to_role: 'MANAGER', tag: 'emergency', priority: 'critical' } },
    { name: 'Cosmetic → Senior Consultant', conditions: { treatment_interest: 'Cosmetic' }, action: { assign_to_role: 'MANAGER', tag: 'cosmetic' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! Thank you for reaching out about {{customFields.treatment_interest}}. We are here to help. Book a consultation: {{booking.link}} 🏥', active: true },
    { name: 'Consultation Reminder', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, a friendly reminder: your {{customFields.treatment_interest}} consultation is tomorrow. Please confirm: {{booking.link}}', active: true },
    { name: 'Post-Consultation Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, hope your consultation went well! Would you like to proceed with the treatment plan? We are happy to answer any questions. 😊', active: true },
    { name: 'Insurance Approval Update', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, we have received an update from your insurance provider {{customFields.insurance_provider}}. Your treatment pre-authorization status is: {{insurance.status}}. We will keep you posted.', active: true },
    { name: 'No Response Follow-up', type: 'RECONNECT', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, just checking in — still interested in {{customFields.treatment_interest}} treatment? We are here whenever you are ready. 💙', active: true },
  ],
  [
    { name: 'New Patient Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Consultation Reminder' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
      { type: 'SEND_WHATSAPP', displayOrder: 5, config: { template: 'Post-Consultation Follow-up' }, waitSeconds: 0 },
    ]},
    { name: 'Insurance Follow-up', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Insurance Approval Update' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 259200 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'No Response Follow-up' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Consultation Appointment', provider: 'calendly', config: { duration: 30, title: '{{customFields.treatment_interest}} Consultation' } },
  ],
  [
    { name: 'Standard Patient Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.treatment_interest': 'treatment_interest__c', 'customFields.insurance': 'insurance_status__c', 'customFields.urgency': 'urgency__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Consultation Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Treatment Plan Requested' },
    { destination: 'ORDER_BOOKING', name: 'Treatment Started' },
  ],
  [
    { name: 'Patients by Treatment', type: 'leads_by_custom_field', config: { field: 'treatment_interest' } },
    { name: 'Consultation to Treatment Conversion', type: 'conversion_funnel', config: { stages: ['Consultation Booked','Consultation Done','Treatment Started'] } },
    { name: 'Revenue by Department', type: 'revenue_summary' },
    { name: 'Urgent Cases Pending', type: 'stalled_pipeline', config: { stage: 'New Inquiry', field: 'urgency', value: 'Emergency' } },
  ],
  [
    { name: 'Auto-assign emergency cases', category: 'automation', eventType: 'LEAD_CREATED', priority: 200, conditions: { 'customFields.urgency': 'Emergency' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }, { type: 'NOTIFY_TEAM', params: { channel: 'WhatsApp', priority: 'critical' } }], active: true },
    { name: 'Notify on new consultation booking', category: 'notification', eventType: 'APPOINTMENT_BOOKED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
    { name: 'Send consultation reminder', category: 'automation', eventType: 'APPOINTMENT_BOOKED', priority: 90, conditions: {}, actions: [{ type: 'SCHEDULE_REMINDER', params: { minutesBefore: 1440, templateKey: 'Consultation Reminder' } }], active: true },
  ],
  { lead: 'Patient Lead', leads: 'Patient Leads', campaign: 'Health Campaign', campaigns: 'Health Campaigns', conversion: 'Treatment Started', pipeline: 'Care Pipeline', booking: 'Consultation' }
);

// ===================================================================
// 3. B2B SERVICE AGENCY
// ===================================================================
export const b2bAgencyTemplate = createTemplate(
  'b2b-agency', 'B2B Service Agency',
  'Lead capture for B2B marketing, consulting, and service agencies. Tracks company size, service needed, budget, decision maker status, and current pain points.',
  'b2b',
  [
    { name: 'Company Name', key: 'company_name', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 1 },
    { name: 'Company Size', key: 'company_size', type: 'DROPDOWN', target: 'LEAD', options: ['1-10','11-50','51-200','201-500','500+'], required: true, displayOrder: 2 },
    { name: 'Service Needed', key: 'service_needed', type: 'DROPDOWN', target: 'LEAD', options: ['Marketing','Consulting','Development','Design','Staffing','Strategy','Other'], required: true, displayOrder: 3 },
    { name: 'Monthly Budget', key: 'monthly_budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $1,000','$1,000-$5,000','$5,000-$20,000','$20,000+'], required: false, displayOrder: 4 },
    { name: 'Current Provider', key: 'current_provider', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 5 },
    { name: 'Decision Maker', key: 'decision_maker', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Pain Points', key: 'pain_points', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Project Timeline', key: 'project_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','1 month','3 months','6 months','Exploring'], required: false, displayOrder: 8 },
    { name: 'Industry', key: 'industry', type: 'DROPDOWN', target: 'LEAD', options: ['SaaS','E-commerce','Healthcare','Finance','Education','Manufacturing','Other'], required: false, displayOrder: 9 },
  ],
  [
    { name: 'Service Inquiry', active: true, fields: [{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Contact Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Work Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Service Needed', fieldKey: 'service_needed', type: 'dropdown', required: true },{ label: 'Company Size', fieldKey: 'company_size', type: 'dropdown', required: true },{ label: 'Budget', fieldKey: 'monthly_budget', type: 'dropdown', required: false }] },
    { name: 'Free Audit Request', active: true, fields: [{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Website URL', fieldKey: 'website', type: 'url', required: true },{ label: 'Current Provider', fieldKey: 'current_provider', type: 'text', required: false }] },
    { name: 'Partnership Inquiry', active: true, fields: [{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Partnership Type', fieldKey: 'service_needed', type: 'dropdown', required: true },{ label: 'Message', fieldKey: 'message', type: 'text', required: true }] },
  ],
  [
    { name: 'LinkedIn Outreach', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Discovery Call Booked' },
    { name: 'Webinar Registration', sourceType: 'FORM', active: true, conversionGoal: 'Discovery Call Booked' },
    { name: 'Free Audit Campaign', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Proposal Requested' },
    { name: 'Referral Partner Program', sourceType: 'WHAT_FORM', active: true, conversionGoal: 'Deal Won' },
  ],
  [
    { name: 'New Lead', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Discovery Call Booked', order: 2, color: '#3b82f6' },
    { name: 'Discovery Done', order: 3, color: '#8b5cf6' },
    { name: 'Proposal Sent', order: 4, color: '#f59e0b' },
    { name: 'Negotiation', order: 5, color: '#14b8a6' },
    { name: 'Contract Sent', order: 6, color: '#ec4899' },
    { name: 'Won', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Lost', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Decision maker', field: 'decision_maker', operator: 'equals', value: 'true', points: 25, active: true },
    { name: 'Budget $5K+', field: 'monthly_budget', operator: 'contains', value: '5,000', points: 20, active: true },
    { name: 'Immediate timeline', field: 'project_timeline', operator: 'equals', value: 'Immediate', points: 30, active: true },
    { name: 'Has current provider (switching intent)', field: 'current_provider', operator: 'exists', value: '', points: 10, active: true },
    { name: '500+ employees', field: 'company_size', operator: 'equals', value: '500+', points: 20, active: true },
    { name: 'Exploring (low intent)', field: 'project_timeline', operator: 'equals', value: 'Exploring', points: -10, active: true },
  ],
  [
    { name: 'Enterprise → Senior BD', conditions: { company_size: '500+' }, action: { assign_to_role: 'MANAGER', tag: 'enterprise', priority: 'high' } },
    { name: 'SaaS Industry → Tech Consultant', conditions: { industry: 'SaaS' }, action: { assign_to_role: 'SALES_AGENT', tag: 'saas' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'EMAIL', body: 'Hi {{contact.name}}, thank you for your interest in our {{customFields.service_needed}} services. We would love to schedule a discovery call to understand your needs. Book here: {{booking.link}}', active: true },
    { name: 'Discovery Call Confirmation', type: 'APPOINTMENT_LINK', channel: 'EMAIL', body: 'Hi {{contact.name}}, your discovery call is confirmed for {{appointment.date}}. Agenda: understanding {{customFields.pain_points}} and how we can help.', active: true },
    { name: 'Post-Discovery Follow-up', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, great speaking with you! Based on our discussion about {{customFields.pain_points}}, we are preparing a custom proposal. Expect it within 48 hours.', active: true },
    { name: 'Proposal Follow-up (1 week)', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, following up on the proposal we sent for {{customFields.service_needed}}. Happy to schedule a call to walk through it: {{booking.link}}', active: true },
    { name: 'Lost Deal Reconnect', type: 'RECONNECT', channel: 'EMAIL', body: 'Hi {{contact.name}}, we noticed it was not the right time earlier. Has anything changed on your end regarding {{customFields.service_needed}}? We would love to reconnect.', active: true },
  ],
  [
    { name: 'Enterprise Lead Nurture', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 172800 },
      { type: 'SEND_EMAIL', displayOrder: 3, config: { template: 'Discovery Call Confirmation' }, waitSeconds: 0 },
      { type: 'CREATE_TASK', displayOrder: 4, config: { title: 'Prepare proposal for {{contact.company}}', priority: 'high' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 5, waitSeconds: 604800 },
      { type: 'SEND_EMAIL', displayOrder: 6, config: { template: 'Proposal Follow-up (1 week)' }, waitSeconds: 0 },
    ]},
    { name: 'Lost Deal Reactivation', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 2592000 },
      { type: 'SEND_EMAIL', displayOrder: 2, config: { template: 'Lost Deal Reconnect' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Discovery Call', provider: 'calendly', config: { duration: 30, title: 'Discovery Call - {{contact.company}}' } },
    { name: 'Proposal Walkthrough', provider: 'calendly', config: { duration: 45, title: 'Proposal Review - {{contact.company}}' } },
  ],
  [
    { name: 'Standard B2B Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.company_name': 'company', 'customFields.company_size': 'numemployees', 'customFields.monthly_budget': 'budget_range__c', 'customFields.service_needed': 'service_interest__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Discovery Call Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Proposal Requested' },
    { destination: 'CRM_QUALIFIED_PUSH', name: 'Deal Won' },
  ],
  [
    { name: 'Leads by Industry', type: 'leads_by_custom_field', config: { field: 'industry' } },
    { name: 'Pipeline by Stage', type: 'pipeline_summary' },
    { name: 'Revenue Forecast', type: 'revenue_summary' },
    { name: 'Stalled Opportunities', type: 'stalled_pipeline', config: { stage: 'Proposal Sent' } },
  ],
  [
    { name: 'Auto-assign enterprise leads', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.company_size': '500+' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Create task on proposal sent', category: 'automation', eventType: 'LEAD_UPDATED', priority: 90, conditions: { status: 'Proposal Sent' }, actions: [{ type: 'CREATE_TASK', params: { title: 'Follow up on proposal', priority: 'high', dueInDays: 3 } }], active: true },
    { name: 'Notify team on deal won', category: 'notification', eventType: 'LEAD_CONVERTED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
  ],
  { lead: 'B2B Lead', leads: 'B2B Leads', campaign: 'Outreach Campaign', campaigns: 'Outreach Campaigns', conversion: 'Deal Won', pipeline: 'Sales Pipeline', booking: 'Discovery Call' }
);

// ===================================================================
// 4. FINANCIAL & INSURANCE ADVISOR
// ===================================================================
export const financeInsuranceTemplate = createTemplate(
  'finance-insurance', 'Financial & Insurance Advisor',
  'Lead capture for financial advisors and insurance agents. Tracks product interest, income range, investment goals, risk profile, and consultation timeline.',
  'finance',
  [
    { name: 'Product Interest', key: 'product_interest', type: 'DROPDOWN', target: 'LEAD', options: ['Life Insurance','Health Insurance','Mutual Funds','Fixed Deposits','Retirement Planning','Tax Planning','Wealth Management','Other'], required: true, displayOrder: 1 },
    { name: 'Income Range', key: 'income_range', type: 'DROPDOWN', target: 'LEAD', options: ['< $50K','$50K-$100K','$100K-$250K','$250K+'], required: false, displayOrder: 2 },
    { name: 'Investment Goal', key: 'investment_goal', type: 'DROPDOWN', target: 'LEAD', options: ['Tax Saving','Wealth Growth','Retirement','Child Education','Emergency Fund'], required: false, displayOrder: 3 },
    { name: 'Risk Profile', key: 'risk_profile', type: 'DROPDOWN', target: 'LEAD', options: ['Conservative','Moderate','Aggressive'], required: false, displayOrder: 4 },
    { name: 'Consultation Timeline', key: 'consultation_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','This Week','This Month','Exploring'], required: false, displayOrder: 5 },
    { name: 'Existing Investments', key: 'existing_investments', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Age Group', key: 'age_group', type: 'DROPDOWN', target: 'LEAD', options: ['18-25','26-35','36-45','46-55','55+'], required: false, displayOrder: 7 },
    { name: 'Preferred Contact', key: 'preferred_contact', type: 'DROPDOWN', target: 'LEAD', options: ['WhatsApp','Email','Phone Call','In-Person'], required: false, displayOrder: 8 },
  ],
  [
    { name: 'Advisory Request', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Product Interest', fieldKey: 'product_interest', type: 'dropdown', required: true },{ label: 'Income Range', fieldKey: 'income_range', type: 'dropdown', required: false }] },
    { name: 'Insurance Quote Request', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Age', fieldKey: 'age', type: 'number', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Coverage Type', fieldKey: 'product_interest', type: 'dropdown', required: true },{ label: 'Coverage Amount', fieldKey: 'coverage_amount', type: 'number', required: false }] },
    { name: 'Tax Planning Consultation', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Annual Income', fieldKey: 'income_range', type: 'dropdown', required: true },{ label: 'Tax Regime', fieldKey: 'tax_regime', type: 'dropdown', required: false }] },
  ],
  [
    { name: 'Tax Saving Campaign', sourceType: 'FORM', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Retirement Planning Webinar', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Health Insurance Awareness', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Quote Requested' },
    { name: 'Wealth Management Workshop', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Consultation Booked' },
  ],
  [
    { name: 'New Lead', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Consultation Booked', order: 2, color: '#3b82f6' },
    { name: 'Needs Analysis Done', order: 3, color: '#8b5cf6' },
    { name: 'Proposal Shared', order: 4, color: '#f59e0b' },
    { name: 'Application Started', order: 5, color: '#10b981' },
    { name: 'Policy Issued', order: 6, color: '#22c55e', isEnd: true },
    { name: 'Not Proceeded', order: 7, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'High income ($100K+)', field: 'income_range', operator: 'contains', value: '100K', points: 20, active: true },
    { name: 'Immediate timeline', field: 'consultation_timeline', operator: 'equals', value: 'Immediate', points: 25, active: true },
    { name: 'Age 46-55 (retirement focus)', field: 'age_group', operator: 'equals', value: '46-55', points: 15, active: true },
    { name: 'Has existing investments', field: 'existing_investments', operator: 'exists', value: '', points: 10, active: true },
    { name: 'Aggressive risk (higher AUM potential)', field: 'risk_profile', operator: 'equals', value: 'Aggressive', points: 10, active: true },
  ],
  [
    { name: 'High Net Worth → Senior Advisor', conditions: { income_range: '250K+' }, action: { assign_to_role: 'MANAGER', tag: 'hnw', priority: 'high' } },
    { name: 'Retirement → Specialist', conditions: { product_interest: 'Retirement Planning' }, action: { assign_to_role: 'SALES_AGENT', tag: 'retirement' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! Thank you for your interest in {{customFields.product_interest}}. I would love to understand your financial goals. Book a free consultation: {{booking.link}} 📊', active: true },
    { name: 'Consultation Confirmation', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your financial consultation is confirmed! Please keep your {{customFields.existing_investments}} details handy for our discussion.', active: true },
    { name: 'Proposal Ready', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your personalized {{customFields.product_interest}} proposal is ready. Key highlights: coverage of $X, premium starting at $Y. Let us discuss: {{booking.link}}', active: true },
    { name: 'Policy Renewal Reminder', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your {{customFields.product_interest}} policy is due for renewal. Would you like to review your coverage before renewal? 📋', active: true },
    { name: 'Market Update Reconnect', type: 'RECONNECT', channel: 'EMAIL', body: 'Hi {{contact.name}}, sharing our quarterly market outlook. Given your interest in {{customFields.product_interest}}, here are some opportunities you might like...', active: true },
  ],
  [
    { name: 'New Lead Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Consultation Confirmation' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
      { type: 'SEND_EMAIL', displayOrder: 5, config: { template: 'Proposal Ready' }, waitSeconds: 0 },
    ]},
    { name: 'Existing Client Retention', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Market Update Reconnect' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 7776000 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Policy Renewal Reminder' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Financial Consultation', provider: 'calendly', config: { duration: 45, title: 'Financial Planning Consultation' } },
  ],
  [
    { name: 'Standard Client Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.product_interest': 'product_of_interest__c', 'customFields.income_range': 'income_range__c', 'customFields.risk_profile': 'risk_profile__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Consultation Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Quote Requested' },
    { destination: 'CRM_QUALIFIED_PUSH', name: 'Policy Issued' },
    { destination: 'PURCHASE_ONLINE', name: 'Premium Paid' },
  ],
  [
    { name: 'Leads by Product', type: 'leads_by_custom_field', config: { field: 'product_interest' } },
    { name: 'Conversion Funnel', type: 'conversion_funnel', config: { stages: ['Consultation Booked','Proposal Shared','Policy Issued'] } },
    { name: 'Revenue by Product', type: 'revenue_summary' },
    { name: 'Renewals Due This Month', type: 'hot_leads' },
  ],
  [
    { name: 'Auto-assign HNW leads to senior advisor', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.income_range': '250K+' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Notify on consultation booked', category: 'notification', eventType: 'APPOINTMENT_BOOKED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'medium' } }], active: true },
  ],
  { lead: 'Client Lead', leads: 'Client Leads', campaign: 'Financial Campaign', campaigns: 'Financial Campaigns', conversion: 'Policy Issued', pipeline: 'Advisory Pipeline', booking: 'Consultation' }
);

// ===================================================================
// 5. LEGAL FIRM
// ===================================================================
export const legalFirmTemplate = createTemplate(
  'legal-firm', 'Legal Firm',
  'Lead capture for law firms. Tracks case type, urgency, location, consultation preference, and opposing party details.',
  'legal',
  [
    { name: 'Case Type', key: 'case_type', type: 'DROPDOWN', target: 'LEAD', options: ['Family Law','Criminal Defense','Corporate','Real Estate','Immigration','IP','Employment','Personal Injury','Other'], required: true, displayOrder: 1 },
    { name: 'Urgency', key: 'urgency', type: 'DROPDOWN', target: 'LEAD', options: ['Emergency','Urgent','Standard'], required: true, displayOrder: 2 },
    { name: 'Location', key: 'location', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 3 },
    { name: 'Consultation Mode', key: 'consultation_mode', type: 'DROPDOWN', target: 'LEAD', options: ['In-Person','Video','Phone'], required: false, displayOrder: 4 },
    { name: 'Opposing Party', key: 'opposing_party', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 5 },
    { name: 'Case Description', key: 'case_description', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Budget for Legal Fees', key: 'legal_budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $5,000','$5,000-$25,000','$25,000-$100,000','$100,000+','Not Sure'], required: false, displayOrder: 7 },
  ],
  [
    { name: 'Case Evaluation Request', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Case Type', fieldKey: 'case_type', type: 'dropdown', required: true },{ label: 'Brief Description', fieldKey: 'case_description', type: 'text', required: true },{ label: 'Urgency', fieldKey: 'urgency', type: 'dropdown', required: true }] },
    { name: 'Quick Legal Advice', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Question', fieldKey: 'case_description', type: 'text', required: true }] },
    { name: 'Corporate Retainer Inquiry', active: true, fields: [{ label: 'Company', fieldKey: 'company', type: 'text', required: true },{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Service Area', fieldKey: 'case_type', type: 'dropdown', required: true }] },
  ],
  [
    { name: 'Legal Awareness Campaign', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Free Consultation Drive', sourceType: 'FORM', active: true, conversionGoal: 'Consultation Booked' },
    { name: 'Corporate Legal Package', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Case Accepted' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Consultation Booked', order: 2, color: '#3b82f6' },
    { name: 'Consultation Done', order: 3, color: '#8b5cf6' },
    { name: 'Case Evaluation', order: 4, color: '#f59e0b' },
    { name: 'Engagement Letter Sent', order: 5, color: '#ec4899' },
    { name: 'Case Accepted', order: 6, color: '#22c55e', isEnd: true },
    { name: 'Referred Out', order: 7, color: '#14b8a6', isEnd: true },
  ],
  [
    { name: 'Emergency case', field: 'urgency', operator: 'equals', value: 'Emergency', points: 35, active: true },
    { name: 'High budget ($25K+)', field: 'legal_budget', operator: 'contains', value: '25,000', points: 20, active: true },
    { name: 'Corporate case (retainer potential)', field: 'case_type', operator: 'equals', value: 'Corporate', points: 15, active: true },
    { name: 'Personal injury (contingency)', field: 'case_type', operator: 'equals', value: 'Personal Injury', points: 10, active: true },
  ],
  [
    { name: 'Emergency → Senior Partner', conditions: { urgency: 'Emergency' }, action: { assign_to_role: 'MANAGER', tag: 'emergency', priority: 'critical' } },
    { name: 'Corporate → Corporate Law Team', conditions: { case_type: 'Corporate' }, action: { assign_to_role: 'MANAGER', tag: 'corporate' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, thank you for reaching out regarding your {{customFields.case_type}} matter. We take client confidentiality seriously. Book a consultation: {{booking.link}} ⚖️', active: true },
    { name: 'Consultation Confirmation', type: 'APPOINTMENT_LINK', channel: 'EMAIL', body: 'Hi {{contact.name}}, your legal consultation is confirmed. Please bring any relevant documents related to {{customFields.case_type}}. We look forward to helping you.', active: true },
    { name: 'Case Evaluation Update', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, we have completed our initial evaluation of your {{customFields.case_type}} matter. Our team will share the engagement terms shortly.', active: true },
    { name: 'Engagement Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, following up on the engagement letter we sent. Happy to discuss any questions about the terms. Reply to this message or call us directly. 📞', active: true },
  ],
  [
    { name: 'New Case Inquiry Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_EMAIL', displayOrder: 3, config: { template: 'Consultation Confirmation' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
      { type: 'SEND_EMAIL', displayOrder: 5, config: { template: 'Case Evaluation Update' }, waitSeconds: 0 },
    ]},
    { name: 'Lost Lead Reconnect', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 2592000 },
      { type: 'SEND_WHATSAPP', displayOrder: 2, config: { template: 'Engagement Follow-up' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Legal Consultation', provider: 'calendly', config: { duration: 45, title: 'Legal Consultation - {{customFields.case_type}}' } },
  ],
  [
    { name: 'Standard Legal Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.case_type': 'case_type__c', 'customFields.urgency': 'urgency__c', 'customFields.location': 'jurisdiction__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Consultation Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Engagement Letter Requested' },
    { destination: 'CRM_QUALIFIED_PUSH', name: 'Case Accepted' },
  ],
  [
    { name: 'Cases by Type', type: 'leads_by_custom_field', config: { field: 'case_type' } },
    { name: 'Conversion by Case Type', type: 'conversion_funnel', config: { stages: ['Consultation Booked','Case Evaluation','Case Accepted'] } },
    { name: 'Revenue by Practice Area', type: 'revenue_summary' },
  ],
  [
    { name: 'Auto-escalate emergency cases', category: 'automation', eventType: 'LEAD_CREATED', priority: 200, conditions: { 'customFields.urgency': 'Emergency' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }, { type: 'NOTIFY_TEAM', params: { channel: 'WhatsApp', priority: 'critical' } }], active: true },
    { name: 'Notify on new corporate inquiry', category: 'notification', eventType: 'LEAD_CREATED', priority: 100, conditions: { 'customFields.case_type': 'Corporate' }, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
  ],
  { lead: 'Legal Inquiry', leads: 'Legal Inquiries', campaign: 'Legal Campaign', campaigns: 'Legal Campaigns', conversion: 'Case Accepted', pipeline: 'Case Pipeline', booking: 'Consultation' }
);

// ===================================================================
// 6. TRAVEL AGENCY
// ===================================================================
export const travelAgencyTemplate = createTemplate(
  'travel-agency', 'Travel Agency',
  'Lead capture for travel agencies, tour operators, and DMCs. Tracks destination, travel date, number of travelers, budget tier, trip type, and visa needs.',
  'travel',
  [
    { name: 'Destination', key: 'destination', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 1 },
    { name: 'Travel Date', key: 'travel_date', type: 'DATE', target: 'LEAD', required: true, displayOrder: 2 },
    { name: 'Number of Travelers', key: 'num_travelers', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 3 },
    { name: 'Budget Tier', key: 'budget_tier', type: 'DROPDOWN', target: 'LEAD', options: ['Budget','Standard','Premium','Luxury'], required: false, displayOrder: 4 },
    { name: 'Trip Type', key: 'trip_type', type: 'DROPDOWN', target: 'LEAD', options: ['Honeymoon','Family','Adventure','Business','Group','Solo','Luxury'], required: false, displayOrder: 5 },
    { name: 'Visa Needed', key: 'visa_needed', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Departure City', key: 'departure_city', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Trip Duration (days)', key: 'trip_duration', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 8 },
    { name: 'Special Requirements', key: 'special_requirements', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 9 },
  ],
  [
    { name: 'Trip Inquiry', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Destination', fieldKey: 'destination', type: 'text', required: true },{ label: 'Travel Date', fieldKey: 'travel_date', type: 'date', required: true },{ label: 'Travelers', fieldKey: 'num_travelers', type: 'number', required: true },{ label: 'Budget', fieldKey: 'budget_tier', type: 'dropdown', required: false }] },
    { name: 'Group Tour Quote', active: true, fields: [{ label: 'Organization/Group Name', fieldKey: 'company', type: 'text', required: true },{ label: 'Contact Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Destination', fieldKey: 'destination', type: 'text', required: true },{ label: 'Group Size', fieldKey: 'num_travelers', type: 'number', required: true },{ label: 'Preferred Dates', fieldKey: 'travel_date', type: 'date', required: true }] },
    { name: 'Visa Assistance Request', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Destination Country', fieldKey: 'destination', type: 'text', required: true },{ label: 'Travel Date', fieldKey: 'travel_date', type: 'date', required: true }] },
  ],
  [
    { name: 'Summer Deals', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Package Booked' },
    { name: 'Honeymoon Packages', sourceType: 'FORM', active: true, conversionGoal: 'Package Booked' },
    { name: 'Group Tour Promotion', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Package Booked' },
    { name: 'Last Minute Deals', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Package Booked' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Itinerary Requested', order: 3, color: '#8b5cf6' },
    { name: 'Itinerary Sent', order: 4, color: '#f59e0b' },
    { name: 'Quote Accepted', order: 5, color: '#10b981' },
    { name: 'Payment Received', order: 6, color: '#14b8a6' },
    { name: 'Package Booked', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Not Interested', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Luxury budget', field: 'budget_tier', operator: 'equals', value: 'Luxury', points: 25, active: true },
    { name: 'Travel within 30 days', field: 'travel_date', operator: 'date_before', value: '30', points: 20, active: true },
    { name: 'Group of 5+ travelers', field: 'num_travelers', operator: 'greater_than', value: '5', points: 15, active: true },
    { name: 'Honeymoon (high emotional intent)', field: 'trip_type', operator: 'equals', value: 'Honeymoon', points: 15, active: true },
    { name: 'Visa needed (committed traveler)', field: 'visa_needed', operator: 'equals', value: 'true', points: 10, active: true },
  ],
  [
    { name: 'Luxury → Senior Consultant', conditions: { budget_tier: 'Luxury' }, action: { assign_to_role: 'MANAGER', tag: 'luxury', priority: 'high' } },
    { name: 'Group Tour → Group Specialist', conditions: { trip_type: 'Group' }, action: { assign_to_role: 'SALES_AGENT', tag: 'group' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! 🌍 Thanks for your interest in {{customFields.destination}}. We would love to create the perfect {{customFields.trip_type}} itinerary for you. Book a call: {{booking.link}} ✈️', active: true },
    { name: 'Itinerary Ready', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your customized {{customFields.destination}} itinerary is ready! 🎉 Check your email for the details. Ready to book? Reply YES!', active: true },
    { name: 'Payment Reminder', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, quick reminder: your {{customFields.destination}} trip balance payment is due soon. Secure your booking now to lock in the current rate! 💳', active: true },
    { name: 'Pre-Travel Checklist', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your {{customFields.destination}} trip is coming up! Here is your pre-travel checklist: visa, insurance, packing list, and local tips. Safe travels! 🧳', active: true },
    { name: 'Post-Trip Feedback', type: 'RECONNECT', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, welcome back! How was your {{customFields.destination}} trip? We would love your feedback. Also, early bird discounts for your next trip! 🏝️', active: true },
  ],
  [
    { name: 'New Inquiry Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'CREATE_TASK', displayOrder: 3, config: { title: 'Prepare itinerary for {{contact.name}} - {{customFields.destination}}', priority: 'high' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 172800 },
      { type: 'SEND_WHATSAPP', displayOrder: 5, config: { template: 'Itinerary Ready' }, waitSeconds: 0 },
    ]},
    { name: 'Post-Trip Reconnect', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 604800 },
      { type: 'SEND_WHATSAPP', displayOrder: 2, config: { template: 'Post-Trip Feedback' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Travel Consultation', provider: 'calendly', config: { duration: 30, title: 'Trip Planning Call - {{customFields.destination}}' } },
  ],
  [
    { name: 'Standard Travel Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.destination': 'destination__c', 'customFields.travel_date': 'travel_date__c', 'customFields.budget_tier': 'budget_tier__c', 'customFields.trip_type': 'trip_type__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Call Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Itinerary Requested' },
    { destination: 'PURCHASE_ONLINE', name: 'Package Booked' },
    { destination: 'ORDER_BOOKING', name: 'Payment Received' },
  ],
  [
    { name: 'Leads by Destination', type: 'leads_by_custom_field', config: { field: 'destination' } },
    { name: 'Bookings by Trip Type', type: 'conversions_by_campaign' },
    { name: 'Revenue Summary', type: 'revenue_summary' },
    { name: 'Upcoming Trips This Month', type: 'hot_leads' },
  ],
  [
    { name: 'Auto-assign luxury inquiries', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.budget_tier': 'Luxury' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Notify on group tour inquiry', category: 'notification', eventType: 'LEAD_CREATED', priority: 100, conditions: { 'customFields.trip_type': 'Group' }, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
  ],
  { lead: 'Travel Lead', leads: 'Travel Leads', campaign: 'Travel Campaign', campaigns: 'Travel Campaigns', conversion: 'Package Booked', pipeline: 'Booking Pipeline', booking: 'Travel Consultation' }
);

// ===================================================================
// 7. HOME IMPROVEMENT & CONSTRUCTION
// ===================================================================
export const homeImprovementTemplate = createTemplate(
  'home-improvement', 'Home Improvement & Construction',
  'Lead capture for home improvement, construction, and interior design firms. Tracks project type, property details, area size, budget, and site visit preferences.',
  'construction',
  [
    { name: 'Project Type', key: 'project_type', type: 'DROPDOWN', target: 'LEAD', options: ['Kitchen','Bathroom','Full Home','Extension','Interior Design','Landscaping','Roofing','Painting','Flooring','Other'], required: true, displayOrder: 1 },
    { name: 'Property Type', key: 'property_type', type: 'DROPDOWN', target: 'LEAD', options: ['Apartment','Villa','Independent House','Office','Retail'], required: false, displayOrder: 2 },
    { name: 'Area (sq ft)', key: 'area_size', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 3 },
    { name: 'Budget', key: 'budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $10K','$10K-$50K','$50K-$100K','$100K-$500K','$500K+'], required: false, displayOrder: 4 },
    { name: 'Location', key: 'location', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 5 },
    { name: 'Timeline', key: 'timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','1 month','3 months','6 months','Planning'], required: false, displayOrder: 6 },
    { name: 'Site Visit Needed', key: 'site_visit', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Design Preference', key: 'design_preference', type: 'DROPDOWN', target: 'LEAD', options: ['Modern','Traditional','Minimalist','Industrial','Not Sure'], required: false, displayOrder: 8 },
    { name: 'Currently Living There', key: 'living_onsite', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 9 },
  ],
  [
    { name: 'Project Inquiry', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Project Type', fieldKey: 'project_type', type: 'dropdown', required: true },{ label: 'Location', fieldKey: 'location', type: 'text', required: true },{ label: 'Area (sq ft)', fieldKey: 'area_size', type: 'number', required: false },{ label: 'Budget Range', fieldKey: 'budget', type: 'dropdown', required: false }] },
    { name: 'Site Visit Request', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Project Type', fieldKey: 'project_type', type: 'dropdown', required: true },{ label: 'Address', fieldKey: 'location', type: 'text', required: true },{ label: 'Preferred Date', fieldKey: 'preferred_date', type: 'date', required: true }] },
    { name: 'Interior Design Consultation', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Room(s)', fieldKey: 'project_type', type: 'dropdown', required: true },{ label: 'Design Style', fieldKey: 'design_preference', type: 'dropdown', required: false },{ label: 'Inspiration Images (link)', fieldKey: 'portfolio_url', type: 'url', required: false }] },
  ],
  [
    { name: 'Renovation Campaign', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Project Booked' },
    { name: 'Free Estimate Campaign', sourceType: 'FORM', active: true, conversionGoal: 'Site Visit Booked' },
    { name: 'Kitchen Remodel Special', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Project Booked' },
    { name: 'Referral Program', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Project Booked' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Site Visit Scheduled', order: 3, color: '#8b5cf6' },
    { name: 'Site Visit Done', order: 4, color: '#a78bfa' },
    { name: 'Estimate Sent', order: 5, color: '#f59e0b' },
    { name: 'Negotiation', order: 6, color: '#14b8a6' },
    { name: 'Project Booked', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Lost', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Site visit requested', field: 'site_visit', operator: 'equals', value: 'true', points: 20, active: true },
    { name: 'Budget $100K+', field: 'budget', operator: 'contains', value: '100K', points: 25, active: true },
    { name: 'Immediate timeline', field: 'timeline', operator: 'equals', value: 'Immediate', points: 20, active: true },
    { name: 'Full home project', field: 'project_type', operator: 'equals', value: 'Full Home', points: 15, active: true },
    { name: 'Large area (2000+ sqft)', field: 'area_size', operator: 'greater_than', value: '2000', points: 10, active: true },
  ],
  [
    { name: 'High Budget → Senior PM', conditions: { budget: '100K' }, action: { assign_to_role: 'MANAGER', tag: 'premium', priority: 'high' } },
    { name: 'Kitchen/Bathroom → Specialist', conditions: { project_type: 'Kitchen' }, action: { assign_to_role: 'SALES_AGENT', tag: 'kitchen_bath' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! 👷 Thanks for your {{customFields.project_type}} inquiry. We would love to visit the site and provide a free estimate. Book here: {{booking.link}} 🏗️', active: true },
    { name: 'Site Visit Confirmation', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your site visit is confirmed for {{appointment.date}}. Our project manager will arrive at {{customFields.location}}. See you then!', active: true },
    { name: 'Estimate Ready', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your {{customFields.project_type}} estimate is ready! 📋 We have included 3D renders and a detailed breakdown. Would you like to discuss?', active: true },
    { name: 'Estimate Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, following up on the {{customFields.project_type}} estimate we shared. Any questions? We are ready to start whenever you are! 🔨', active: true },
    { name: 'Project Completion Celebration', type: 'THANK_YOU', channel: 'WHATSAPP', body: 'Congratulations {{contact.name}}! 🎉 Your {{customFields.project_type}} project is complete. We hope you love the transformation. Please share your feedback!', active: true },
  ],
  [
    { name: 'New Project Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Site Visit Confirmation' }, waitSeconds: 0 },
      { type: 'CREATE_TASK', displayOrder: 4, config: { title: 'Prepare estimate for {{contact.name}} - {{customFields.project_type}}', priority: 'high' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 5, waitSeconds: 259200 },
      { type: 'SEND_WHATSAPP', displayOrder: 6, config: { template: 'Estimate Ready' }, waitSeconds: 0 },
    ]},
    { name: 'Lost Lead Reconnect', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 2592000 },
      { type: 'SEND_WHATSAPP', displayOrder: 2, config: { template: 'Estimate Follow-up' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Site Visit Appointment', provider: 'calendly', config: { duration: 60, title: 'Site Visit - {{customFields.project_type}} at {{customFields.location}}' } },
  ],
  [
    { name: 'Standard Project Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.project_type': 'project_type__c', 'customFields.budget': 'budget__c', 'customFields.location': 'project_address__c', 'customFields.timeline': 'timeline__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Site Visit Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Estimate Requested' },
    { destination: 'ORDER_BOOKING', name: 'Project Booked' },
    { destination: 'PURCHASE_ONLINE', name: 'Advance Paid' },
  ],
  [
    { name: 'Leads by Project Type', type: 'leads_by_custom_field', config: { field: 'project_type' } },
    { name: 'Site Visit to Booking Conversion', type: 'conversion_funnel', config: { stages: ['Site Visit Scheduled','Estimate Sent','Project Booked'] } },
    { name: 'Revenue Pipeline', type: 'revenue_summary' },
    { name: 'Estimates Pending Follow-up', type: 'stalled_pipeline', config: { stage: 'Estimate Sent' } },
  ],
  [
    { name: 'Auto-assign high-value projects', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.budget': '100K' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Create task on site visit scheduled', category: 'automation', eventType: 'APPOINTMENT_BOOKED', priority: 90, conditions: {}, actions: [{ type: 'CREATE_TASK', params: { title: 'Conduct site visit - {{customFields.location}}', priority: 'high' } }], active: true },
  ],
  { lead: 'Project Lead', leads: 'Project Leads', campaign: 'Renovation Campaign', campaigns: 'Renovation Campaigns', conversion: 'Project Booked', pipeline: 'Project Pipeline', booking: 'Site Visit' }
);

// ===================================================================
// 8. AUTOMOTIVE DEALERSHIP
// ===================================================================
export const automotiveDealerTemplate = createTemplate(
  'automotive-dealer', 'Automotive Dealership',
  'Lead capture for car dealerships and automotive sales. Tracks vehicle interest, budget, finance needs, trade-in, test drive scheduling, and purchase timeline.',
  'automotive',
  [
    { name: 'Vehicle Interest', key: 'vehicle_interest', type: 'DROPDOWN', target: 'LEAD', options: ['Sedan','SUV','Hatchback','Luxury','EV','Truck','Commercial','Two-Wheeler'], required: true, displayOrder: 1 },
    { name: 'Brand Preference', key: 'brand_preference', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 2 },
    { name: 'Budget', key: 'budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $20K','$20K-$40K','$40K-$70K','$70K-$150K','$150K+'], required: false, displayOrder: 3 },
    { name: 'Finance Needed', key: 'finance_needed', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 4 },
    { name: 'Trade-in', key: 'trade_in', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 5 },
    { name: 'Trade-in Details', key: 'trade_in_details', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Test Drive Date', key: 'test_drive_date', type: 'DATE', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Purchase Timeline', key: 'purchase_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','Within 1 month','1-3 months','3-6 months','Just Browsing'], required: false, displayOrder: 8 },
    { name: 'Usage Type', key: 'usage_type', type: 'DROPDOWN', target: 'LEAD', options: ['Personal','Family','Business','Fleet'], required: false, displayOrder: 9 },
  ],
  [
    { name: 'Test Drive Booking', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Vehicle Type', fieldKey: 'vehicle_interest', type: 'dropdown', required: true },{ label: 'Preferred Date', fieldKey: 'test_drive_date', type: 'date', required: true }] },
    { name: 'Finance Pre-Approval', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Annual Income', fieldKey: 'income', type: 'number', required: true },{ label: 'Vehicle Interest', fieldKey: 'vehicle_interest', type: 'dropdown', required: true }] },
    { name: 'Trade-in Valuation', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Vehicle Make/Model', fieldKey: 'trade_in_details', type: 'text', required: true },{ label: 'Year', fieldKey: 'trade_in_year', type: 'number', required: true },{ label: 'Kilometers', fieldKey: 'trade_in_km', type: 'number', required: false }] },
  ],
  [
    { name: 'New Launch Campaign', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Test Drive Booked' },
    { name: 'Test Drive Campaign', sourceType: 'FORM', active: true, conversionGoal: 'Test Drive Booked' },
    { name: 'Year-End Clearance', sourceType: 'WHATSAPP', active: true, conversionGoal: 'Purchase' },
    { name: 'EV Awareness Campaign', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Test Drive Booked' },
  ],
  [
    { name: 'New Lead', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Contacted', order: 2, color: '#3b82f6' },
    { name: 'Test Drive Scheduled', order: 3, color: '#8b5cf6' },
    { name: 'Test Drive Done', order: 4, color: '#a78bfa' },
    { name: 'Finance Quote', order: 5, color: '#f59e0b' },
    { name: 'Negotiation', order: 6, color: '#14b8a6' },
    { name: 'Deal Closed', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Lost', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Immediate purchase', field: 'purchase_timeline', operator: 'equals', value: 'Immediate', points: 30, active: true },
    { name: 'Finance needed (dealer financing)', field: 'finance_needed', operator: 'equals', value: 'true', points: 15, active: true },
    { name: 'Trade-in (serious buyer)', field: 'trade_in', operator: 'equals', value: 'true', points: 20, active: true },
    { name: 'Luxury/EV (higher margin)', field: 'vehicle_interest', operator: 'contains', value: 'Luxury', points: 15, active: true },
    { name: 'Fleet purchase', field: 'usage_type', operator: 'equals', value: 'Fleet', points: 25, active: true },
    { name: 'Just browsing', field: 'purchase_timeline', operator: 'equals', value: 'Just Browsing', points: -15, active: true },
  ],
  [
    { name: 'Luxury → Senior Sales', conditions: { vehicle_interest: 'Luxury' }, action: { assign_to_role: 'MANAGER', tag: 'luxury', priority: 'high' } },
    { name: 'Fleet → Fleet Manager', conditions: { usage_type: 'Fleet' }, action: { assign_to_role: 'MANAGER', tag: 'fleet' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! 👋 Great choice — the {{customFields.vehicle_interest}} is an excellent vehicle. Ready for a test drive? Book here: {{booking.link}} 🚗', active: true },
    { name: 'Test Drive Reminder', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, reminder: your {{customFields.vehicle_interest}} test drive is tomorrow! Bring your driver license. See you at the showroom! 🏎️', active: true },
    { name: 'Post-Test Drive Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, how was the test drive? 🚙 Loved it? We have some great finance offers on the {{customFields.vehicle_interest}}. Let us know if you have questions!', active: true },
    { name: 'Finance Offer', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, great news! You are pre-approved for {{customFields.vehicle_interest}} financing with EMI starting at $X. Want to proceed? 💰', active: true },
    { name: 'Service Reminder', type: 'RECONNECT', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, it has been 6 months since your {{customFields.vehicle_interest}} purchase. Time for your first service? Book here: {{booking.link}} 🔧', active: true },
  ],
  [
    { name: 'New Lead Nurture', active: true, steps: [
      { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Test Drive Reminder' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 172800 },
      { type: 'SEND_WHATSAPP', displayOrder: 5, config: { template: 'Post-Test Drive Follow-up' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 6, waitSeconds: 259200 },
      { type: 'SEND_WHATSAPP', displayOrder: 7, config: { template: 'Finance Offer' }, waitSeconds: 0 },
    ]},
    { name: 'Post-Purchase Retention', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 15552000 },
      { type: 'SEND_WHATSAPP', displayOrder: 2, config: { template: 'Service Reminder' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Test Drive Appointment', provider: 'calendly', config: { duration: 45, title: '{{customFields.vehicle_interest}} Test Drive' } },
    { name: 'Finance Consultation', provider: 'calendly', config: { duration: 30, title: 'Auto Finance Consultation' } },
  ],
  [
    { name: 'Standard Buyer Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.vehicle_interest': 'vehicle_of_interest__c', 'customFields.budget': 'budget__c', 'customFields.purchase_timeline': 'purchase_timeline__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Test Drive Booked' },
    { destination: 'QUOTE_REQUEST', name: 'Finance Quote Requested' },
    { destination: 'PURCHASE_ONLINE', name: 'Purchase Completed' },
    { destination: 'ORDER_BOOKING', name: 'Booking Amount Paid' },
  ],
  [
    { name: 'Leads by Vehicle Type', type: 'leads_by_custom_field', config: { field: 'vehicle_interest' } },
    { name: 'Test Drive to Purchase Conversion', type: 'conversion_funnel', config: { stages: ['Test Drive Scheduled','Test Drive Done','Deal Closed'] } },
    { name: 'Revenue by Model', type: 'revenue_summary' },
    { name: 'Finance Leads Pending', type: 'stalled_pipeline', config: { stage: 'Finance Quote' } },
  ],
  [
    { name: 'Auto-assign luxury/fleet leads', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.vehicle_interest': ['Luxury', 'Commercial'] }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Send test drive reminder 2h before', category: 'automation', eventType: 'APPOINTMENT_BOOKED', priority: 90, conditions: {}, actions: [{ type: 'SCHEDULE_REMINDER', params: { minutesBefore: 120, templateKey: 'Test Drive Reminder' } }], active: true },
  ],
  { lead: 'Buyer Lead', leads: 'Buyer Leads', campaign: 'Dealership Campaign', campaigns: 'Dealership Campaigns', conversion: 'Purchase', pipeline: 'Sales Pipeline', booking: 'Test Drive' }
);

// ===================================================================
// 9. FRANCHISE SALES
// ===================================================================
export const franchiseSalesTemplate = createTemplate(
  'franchise-sales', 'Franchise Sales',
  'Lead capture for franchise sales teams. Tracks investment budget, location preference, business experience, timeline, and franchise category interest.',
  'franchise',
  [
    { name: 'Investment Budget', key: 'investment_budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $50K','$50K-$100K','$100K-$250K','$250K-$500K','$500K+'], required: true, displayOrder: 1 },
    { name: 'Preferred Location', key: 'preferred_location', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 2 },
    { name: 'Business Experience', key: 'business_experience', type: 'DROPDOWN', target: 'LEAD', options: ['None','Some','Extensive','Previous Franchisee'], required: false, displayOrder: 3 },
    { name: 'Timeline', key: 'timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','3 months','6 months','12 months','Exploring'], required: false, displayOrder: 4 },
    { name: 'Franchise Category', key: 'franchise_category', type: 'DROPDOWN', target: 'LEAD', options: ['Food & Beverage','Retail','Education','Fitness','Service','Other'], required: false, displayOrder: 5 },
    { name: 'Current Occupation', key: 'current_occupation', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 6 },
    { name: 'Multiple Locations', key: 'multi_location', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Financing Pre-Approved', key: 'financing_approved', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 8 },
  ],
  [
    { name: 'Franchise Inquiry', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Investment Budget', fieldKey: 'investment_budget', type: 'dropdown', required: true },{ label: 'Preferred Location', fieldKey: 'preferred_location', type: 'text', required: false },{ label: 'Business Experience', fieldKey: 'business_experience', type: 'dropdown', required: false }] },
    { name: 'Discovery Day Registration', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Preferred Date', fieldKey: 'preferred_date', type: 'date', required: true }] },
    { name: 'FDD Request', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Location', fieldKey: 'preferred_location', type: 'text', required: true }] },
  ],
  [
    { name: 'Franchise Expo Campaign', sourceType: 'QR_CODE', active: true, conversionGoal: 'Discovery Call Booked' },
    { name: 'Digital Franchise Ads', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Discovery Call Booked' },
    { name: 'Webinar: Franchise Ownership', sourceType: 'FORM', active: true, conversionGoal: 'Discovery Call Booked' },
  ],
  [
    { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Discovery Call Booked', order: 2, color: '#3b82f6' },
    { name: 'Application Submitted', order: 3, color: '#8b5cf6' },
    { name: 'Background Check', order: 4, color: '#a78bfa' },
    { name: 'Discovery Day Attended', order: 5, color: '#f59e0b' },
    { name: 'Agreement Signed', order: 6, color: '#22c55e', isEnd: true },
    { name: 'Not Qualified', order: 7, color: '#ef4444', isEnd: true },
  ],
  [
    { name: 'Budget $250K+', field: 'investment_budget', operator: 'contains', value: '250K', points: 25, active: true },
    { name: 'Previous franchisee', field: 'business_experience', operator: 'equals', value: 'Previous Franchisee', points: 20, active: true },
    { name: 'Multi-location interest', field: 'multi_location', operator: 'equals', value: 'true', points: 20, active: true },
    { name: 'Financing pre-approved', field: 'financing_approved', operator: 'equals', value: 'true', points: 25, active: true },
    { name: 'Immediate timeline', field: 'timeline', operator: 'equals', value: 'Immediate', points: 15, active: true },
  ],
  [
    { name: 'High Budget → VP Franchise', conditions: { investment_budget: '500K+' }, action: { assign_to_role: 'MANAGER', tag: 'premium', priority: 'high' } },
    { name: 'Multi-location → Director', conditions: { multi_location: 'true' }, action: { assign_to_role: 'MANAGER', tag: 'multi_unit' } },
  ],
  [
    { name: 'First Response', type: 'WELCOME', channel: 'EMAIL', body: 'Hi {{contact.name}}, thank you for your interest in our franchise opportunity. We are excited to share more about our proven business model. Book a discovery call: {{booking.link}}', active: true },
    { name: 'Discovery Call Confirmation', type: 'APPOINTMENT_LINK', channel: 'EMAIL', body: 'Hi {{contact.name}}, your franchise discovery call is confirmed. We will discuss the investment, support, and your goals for {{customFields.preferred_location}}.', active: true },
    { name: 'FDD Sent', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, as discussed, here is the Franchise Disclosure Document (FDD). Please review sections 5-7 on investment and obligations. We are here for questions.', active: true },
    { name: 'Discovery Day Invitation', type: 'APPOINTMENT_LINK', channel: 'EMAIL', body: 'Hi {{contact.name}}, congratulations! You are invited to our Discovery Day. Meet the team, visit a location, and envision your future with us. RSVP: {{booking.link}}', active: true },
    { name: 'Agreement Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, following up on the franchise agreement. Any questions before you sign? We have a great territory available in {{customFields.preferred_location}}.', active: true },
  ],
  [
    { name: 'New Franchise Inquiry', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 172800 },
      { type: 'SEND_EMAIL', displayOrder: 3, config: { template: 'Discovery Call Confirmation' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
      { type: 'SEND_EMAIL', displayOrder: 5, config: { template: 'FDD Sent' }, waitSeconds: 0 },
    ]},
    { name: 'Application Follow-up', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Discovery Day Invitation' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 604800 },
      { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Agreement Follow-up' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Franchise Discovery Call', provider: 'calendly', config: { duration: 45, title: 'Franchise Discovery Call' } },
  ],
  [
    { name: 'Standard Franchise Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.investment_budget': 'investment_budget__c', 'customFields.preferred_location': 'territory__c', 'customFields.business_experience': 'experience_level__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Discovery Call Booked' },
    { destination: 'QUOTE_REQUEST', name: 'FDD Requested' },
    { destination: 'CRM_QUALIFIED_PUSH', name: 'Agreement Signed' },
    { destination: 'MEMBER_REGISTRATION', name: 'Discovery Day Attended' },
  ],
  [
    { name: 'Leads by Budget Range', type: 'leads_by_custom_field', config: { field: 'investment_budget' } },
    { name: 'Application Funnel', type: 'conversion_funnel', config: { stages: ['Discovery Call Booked','Application Submitted','Agreement Signed'] } },
    { name: 'Revenue by Territory', type: 'revenue_summary' },
  ],
  [
    { name: 'Auto-assign premium leads', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.investment_budget': '500K+' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Notify on FDD request', category: 'notification', eventType: 'QUOTE_REQUESTED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
  ],
  { lead: 'Franchise Lead', leads: 'Franchise Leads', campaign: 'Franchise Campaign', campaigns: 'Franchise Campaigns', conversion: 'Agreement Signed', pipeline: 'Franchise Pipeline', booking: 'Discovery Call' }
);

// ===================================================================
// 10. SAAS DEMO BOOKING
// ===================================================================
export const saasDemoTemplate = createTemplate(
  'saas-demo', 'SaaS Demo Booking',
  'Lead capture for B2B SaaS companies. Tracks company size, use case, budget, current tools, integration needs, and decision timeline.',
  'saas',
  [
    { name: 'Company Name', key: 'company_name', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 1 },
    { name: 'Company Size', key: 'company_size', type: 'DROPDOWN', target: 'LEAD', options: ['1-10','11-50','51-200','201-500','500-1000','1000+'], required: true, displayOrder: 2 },
    { name: 'Use Case', key: 'use_case', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 3 },
    { name: 'Current Tool/Competitor', key: 'current_tool', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 4 },
    { name: 'Monthly Budget', key: 'budget', type: 'DROPDOWN', target: 'LEAD', options: ['< $100/mo','$100-$500/mo','$500-$2K/mo','$2K-$10K/mo','$10K+/mo','Enterprise'], required: false, displayOrder: 5 },
    { name: 'Decision Timeline', key: 'decision_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','2 weeks','1 month','3 months','Researching'], required: false, displayOrder: 6 },
    { name: 'Integration Needs', key: 'integration_needs', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 7 },
    { name: 'Role', key: 'role', type: 'DROPDOWN', target: 'LEAD', options: ['CEO/Founder','CTO','VP Engineering','Director','Manager','Individual Contributor'], required: false, displayOrder: 8 },
  ],
  [
    { name: 'Demo Request', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Work Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Use Case', fieldKey: 'use_case', type: 'text', required: true },{ label: 'Company Size', fieldKey: 'company_size', type: 'dropdown', required: true }] },
    { name: 'Free Trial Sign-up', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Work Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Password', fieldKey: 'password', type: 'password', required: true }] },
    { name: 'Contact Sales (Enterprise)', active: true, fields: [{ label: 'Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Work Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Company', fieldKey: 'company_name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Team Size', fieldKey: 'company_size', type: 'dropdown', required: true },{ label: 'Message', fieldKey: 'use_case', type: 'text', required: true }] },
  ],
  [
    { name: 'LinkedIn Ads', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Demo Booked' },
    { name: 'Product Webinar', sourceType: 'FORM', active: true, conversionGoal: 'Demo Booked' },
    { name: 'Google Search Campaign', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Trial Started' },
    { name: 'G2/Capterra Review', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Trial Started' },
  ],
  [
    { name: 'New Lead', order: 1, color: '#6b7280', isDefault: true },
    { name: 'Demo Scheduled', order: 2, color: '#3b82f6' },
    { name: 'Demo Done', order: 3, color: '#8b5cf6' },
    { name: 'Trial Started', order: 4, color: '#10b981' },
    { name: 'POC/Pilot', order: 5, color: '#f59e0b' },
    { name: 'Procurement', order: 6, color: '#ec4899' },
    { name: 'Customer', order: 7, color: '#22c55e', isEnd: true },
    { name: 'Closed Lost', order: 8, color: '#ef4444', isEnd: true },
  ],
  [
    { name: '1000+ employees', field: 'company_size', operator: 'contains', value: '1000', points: 25, active: true },
    { name: 'Enterprise budget', field: 'budget', operator: 'equals', value: 'Enterprise', points: 30, active: true },
    { name: 'Immediate decision', field: 'decision_timeline', operator: 'equals', value: 'Immediate', points: 25, active: true },
    { name: 'Decision maker (CEO/CTO)', field: 'role', operator: 'contains', value: 'CEO', points: 20, active: true },
    { name: 'Has current tool (switching)', field: 'current_tool', operator: 'exists', value: '', points: 10, active: true },
    { name: 'Researching only (low intent)', field: 'decision_timeline', operator: 'equals', value: 'Researching', points: -10, active: true },
  ],
  [
    { name: 'Enterprise → Strategic AE', conditions: { company_size: '1000+' }, action: { assign_to_role: 'MANAGER', tag: 'enterprise', priority: 'high' } },
    { name: 'CEO/Founder → Executive AE', conditions: { role: 'CEO/Founder' }, action: { assign_to_role: 'MANAGER', tag: 'executive' } },
  ],
  [
    { name: 'Demo Confirmation', type: 'WELCOME', channel: 'EMAIL', body: 'Hi {{contact.name}}, your personalized demo of our platform is confirmed! We will tailor it to your use case: {{customFields.use_case}}. Join here: {{booking.link}} 💻', active: true },
    { name: 'Demo Follow-up (24h)', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, great demo today! Here is a recap of what we covered for {{customFields.use_case}}. Ready to start a free trial? Sign up: {{trial.link}}', active: true },
    { name: 'Trial Activation', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your 14-day trial of our platform is active! 🎉 Here are 3 quick wins for your {{customFields.use_case}}: [guide link]. Need help? Book a call.', active: true },
    { name: 'Trial Ending (3 days)', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your trial ends in 3 days. Ready to upgrade? Our team is here to help with procurement and security review. Book a call: {{booking.link}}', active: true },
    { name: 'Enterprise Proposal', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, your enterprise proposal for {{contact.company}} is ready. Key highlights: SSO, custom SLA, dedicated support. Let us schedule a review: {{booking.link}}', active: true },
  ],
  [
    { name: 'Demo to Trial Nurture', active: true, steps: [
      { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Demo Confirmation' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 2, waitSeconds: 172800 },
      { type: 'SEND_EMAIL', displayOrder: 3, config: { template: 'Demo Follow-up (24h)' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
      { type: 'SEND_EMAIL', displayOrder: 5, config: { template: 'Trial Activation' }, waitSeconds: 0 },
    ]},
    { name: 'Trial to Purchase Nurture', active: true, steps: [
      { type: 'WAIT', displayOrder: 1, waitSeconds: 950400 },
      { type: 'SEND_EMAIL', displayOrder: 2, config: { template: 'Trial Ending (3 days)' }, waitSeconds: 0 },
      { type: 'WAIT', displayOrder: 3, waitSeconds: 259200 },
      { type: 'SEND_EMAIL', displayOrder: 4, config: { template: 'Enterprise Proposal' }, waitSeconds: 0 },
    ]},
  ],
  [
    { name: 'Product Demo', provider: 'calendly', config: { duration: 45, title: 'Product Demo - {{contact.company}}' } },
    { name: 'Technical Deep Dive', provider: 'calendly', config: { duration: 60, title: 'Technical Deep Dive - {{contact.company}}' } },
  ],
  [
    { name: 'Standard SaaS Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.company_name': 'company', 'customFields.company_size': 'numemployees', 'customFields.budget': 'budget__c', source: 'lead_source__c' } },
  ],
  [
    { destination: 'APPOINTMENT_BOOKING', name: 'Demo Booked' },
    { destination: 'USER_SUBSCRIPTION', name: 'Trial Started' },
    { destination: 'PURCHASE_ONLINE', name: 'Subscription Started' },
    { destination: 'CRM_QUALIFIED_PUSH', name: 'Customer' },
  ],
  [
    { name: 'Leads by Company Size', type: 'leads_by_custom_field', config: { field: 'company_size' } },
    { name: 'Demo to Customer Funnel', type: 'conversion_funnel', config: { stages: ['Demo Scheduled','Demo Done','Trial Started','Customer'] } },
    { name: 'ARR Pipeline', type: 'revenue_summary' },
    { name: 'Trial Ending This Week', type: 'hot_leads' },
  ],
  [
    { name: 'Auto-assign enterprise leads', category: 'automation', eventType: 'LEAD_CREATED', priority: 150, conditions: { 'customFields.company_size': '1000+' }, actions: [{ type: 'ASSIGN_TO_AVAILABLE_AGENT', params: { role: 'MANAGER' } }], active: true },
    { name: 'Notify on demo booked', category: 'notification', eventType: 'APPOINTMENT_BOOKED', priority: 100, conditions: {}, actions: [{ type: 'NOTIFY_TEAM', params: { channel: 'in-app', priority: 'high' } }], active: true },
    { name: 'Send trial ending reminder', category: 'automation', eventType: 'USER_SUBSCRIPTION', priority: 90, conditions: {}, actions: [{ type: 'SCHEDULE_REMINDER', params: { minutesBefore: 4320, templateKey: 'Trial Ending (3 days)' } }], active: true },
  ],
  { lead: 'Demo Lead', leads: 'Demo Leads', campaign: 'Acquisition Campaign', campaigns: 'Acquisition Campaigns', conversion: 'Customer', pipeline: 'Sales Pipeline', booking: 'Demo' }
);
