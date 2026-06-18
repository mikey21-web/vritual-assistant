export const eventMarketingAgencyTemplate = {
  key: 'event-marketing-agency',
  name: 'Event Marketing Agency',
  description: 'Lead capture, qualification, proposal, and booking system for event marketing agencies. Handles event consultation, sponsorship, ticketing, and corporate event leads with automated WhatsApp/email follow-up.',
  industry: 'events',
  version: 1,
  packs: {
    customFields: {
      type: 'custom_fields',
      name: 'Event Agency Lead Fields',
      order: 1,
      payload: {
        fields: [
          { name: 'Event Type', key: 'event_type', type: 'DROPDOWN', target: 'LEAD', options: ['Wedding', 'Corporate', 'Music Festival', 'College Fest', 'Product Launch', 'Conference', 'Award Show', 'Exhibition', 'Private Party', 'Other'], required: true, displayOrder: 1 },
          { name: 'Event Date', key: 'event_date', type: 'DATE', target: 'LEAD', required: true, displayOrder: 2 },
          { name: 'Event Location', key: 'event_location', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 3 },
          { name: 'Expected Guests', key: 'expected_guests', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 4 },
          { name: 'Budget Range', key: 'budget_range', type: 'DROPDOWN', target: 'LEAD', options: ['Under $5,000', '$5,000 - $15,000', '$15,000 - $50,000', '$50,000 - $100,000', '$100,000+', 'Not Decided'], required: false, displayOrder: 5 },
          { name: 'Venue Status', key: 'venue_status', type: 'DROPDOWN', target: 'LEAD', options: ['Already Booked', 'Shortlisted', 'Not Decided', 'Needs Help Finding'], required: false, displayOrder: 6 },
          { name: 'Services Needed', key: 'services_needed', type: 'DROPDOWN', target: 'LEAD', options: ['Full Event Marketing', 'Sponsorship Sales', 'Ticketing Only', 'Social Media Promotion', 'Influencer Marketing', 'PR & Media', 'Brand Activation', 'Not Sure'], required: true, displayOrder: 7 },
          { name: 'Sponsor Interest', key: 'sponsor_interest', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 8 },
          { name: 'Ticketing Needed', key: 'ticketing_needed', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 9 },
          { name: 'Marketing Goal', key: 'marketing_goal', type: 'DROPDOWN', target: 'LEAD', options: ['Brand Awareness', 'Ticket Sales', 'Sponsor Acquisition', 'Lead Generation', 'Community Building', 'Press Coverage', 'Mixed'], required: false, displayOrder: 10 },
          { name: 'Decision Timeline', key: 'decision_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate', 'This Week', 'This Month', 'Next 30 Days', 'Next Quarter', 'Exploring'], required: false, displayOrder: 11 },
          { name: 'Urgency Level', key: 'urgency_level', type: 'DROPDOWN', target: 'LEAD', options: ['Critical', 'High', 'Medium', 'Low'], required: false, displayOrder: 12 },
          { name: 'Preferred Contact', key: 'preferred_contact_channel', type: 'DROPDOWN', target: 'LEAD', options: ['WhatsApp', 'Email', 'Phone Call', 'Video Call'], required: false, displayOrder: 13 },
          { name: 'Lead Source Detail', key: 'lead_source_event', type: 'TEXT', target: 'LEAD', required: false, displayOrder: 14 },
        ],
      },
    },
    lead_forms: {
      type: 'lead_forms',
      name: 'Event Agency Forms',
      order: 2,
      payload: {
        forms: [
          { name: 'Event Consultation Request', active: true, fields: [{ label: 'Company/Organization', fieldKey: 'organization', type: 'text', required: true }, { label: 'Event Type', fieldKey: 'event_type', type: 'dropdown', required: true }, { label: 'Event Date', fieldKey: 'event_date', type: 'date', required: true }, { label: 'Expected Guests', fieldKey: 'expected_guests', type: 'number', required: false }, { label: 'Budget Range', fieldKey: 'budget_range', type: 'dropdown', required: false }, { label: 'Services Needed', fieldKey: 'services_needed', type: 'dropdown', required: true }, { label: 'Message', fieldKey: 'message', type: 'text', required: false }] },
          { name: 'Sponsorship Campaign Inquiry', active: true, fields: [{ label: 'Event Name', fieldKey: 'event_name', type: 'text', required: true }, { label: 'Event Type', fieldKey: 'event_type', type: 'dropdown', required: true }, { label: 'Sponsorship Goal', fieldKey: 'sponsorship_goal', type: 'text', required: false }, { label: 'Target Sponsors', fieldKey: 'target_sponsors', type: 'text', required: false }, { label: 'Budget', fieldKey: 'budget_range', type: 'dropdown', required: false }, { label: 'Contact Email', fieldKey: 'email', type: 'email', required: true }] },
          { name: 'Corporate Event Lead Form', active: true, fields: [{ label: 'Company Name', fieldKey: 'company', type: 'text', required: true }, { label: 'Event Type', fieldKey: 'event_type', type: 'dropdown', required: true }, { label: 'Event Date', fieldKey: 'event_date', type: 'date', required: true }, { label: 'Expected Attendees', fieldKey: 'expected_guests', type: 'number', required: true }, { label: 'Contact Name', fieldKey: 'name', type: 'text', required: true }, { label: 'Contact Phone', fieldKey: 'phone', type: 'tel', required: true }, { label: 'Contact Email', fieldKey: 'email', type: 'email', required: true }] },
          { name: 'Vendor Partnership Form', active: true, fields: [{ label: 'Business Name', fieldKey: 'company', type: 'text', required: true }, { label: 'Service Category', fieldKey: 'service_category', type: 'dropdown', required: true }, { label: 'Portfolio Link', fieldKey: 'portfolio_url', type: 'url', required: false }, { label: 'Message', fieldKey: 'message', type: 'text', required: true }] },
          { name: 'Quick Quote Request', active: true, fields: [{ label: 'Event Type', fieldKey: 'event_type', type: 'dropdown', required: true }, { label: 'Event Date', fieldKey: 'event_date', type: 'date', required: true }, { label: 'Expected Guests', fieldKey: 'expected_guests', type: 'number', required: true }, { label: 'Budget Range', fieldKey: 'budget_range', type: 'dropdown', required: true }, { label: 'Services Needed', fieldKey: 'services_needed', type: 'dropdown', required: true }] },
        ],
      },
    },
    campaigns: {
      type: 'campaigns',
      name: 'Event Agency Campaigns',
      order: 3,
      payload: {
        campaigns: [
          { name: 'Wedding Expo Lead Capture', sourceType: 'QR_CODE', active: true, conversionGoal: 'Consultation Booked', description: 'QR code placed at wedding expo booth capturing interested couples' },
          { name: 'Corporate Event Campaign', sourceType: 'FORM', active: true, conversionGoal: 'Proposal Sent', description: 'LinkedIn and email campaign targeting corporate event planners' },
          { name: 'Music Festival Sponsor Leads', sourceType: 'SOCIAL_MEDIA', active: true, conversionGoal: 'Sponsorship Deal Signed', description: 'Instagram/Facebook campaign promoting sponsorship packages' },
          { name: 'College Fest Campaign', sourceType: 'CHATBOT', active: true, conversionGoal: 'Meeting Booked', description: 'WhatsApp chatbot campaign targeting college fest organizers' },
          { name: 'Product Launch Campaign', sourceType: 'FORM', active: true, conversionGoal: 'Event Booked', description: 'Form-based campaign for product launch event inquiries' },
          { name: 'Conference Delegate Acquisition', sourceType: 'CAMPAIGN', active: true, conversionGoal: 'Ticket Sold', description: 'Multi-channel campaign for conference delegate registration' },
        ],
      },
    },
    pipeline_stages: {
      type: 'pipeline_stages',
      name: 'Event Agency Pipeline',
      order: 4,
      payload: {
        stages: [
          { name: 'New Inquiry', order: 1, color: '#6b7280', isDefault: true },
          { name: 'Contacted', order: 2, color: '#3b82f6' },
          { name: 'Details Collected', order: 3, color: '#8b5cf6' },
          { name: 'Qualified', order: 4, color: '#10b981' },
          { name: 'Proposal Needed', order: 5, color: '#f59e0b' },
          { name: 'Proposal Sent', order: 6, color: '#6366f1' },
          { name: 'Follow-Up', order: 7, color: '#ec4899' },
          { name: 'Negotiation', order: 8, color: '#14b8a6' },
          { name: 'Booked', order: 9, color: '#22c55e', isEnd: true },
          { name: 'Lost', order: 10, color: '#ef4444', isEnd: true },
        ],
      },
    },
    scoring_rules: {
      type: 'scoring_rules',
      name: 'Event Agency Scoring',
      order: 5,
      payload: {
        rules: [
          { name: 'Budget above $15K', field: 'budget_range', operator: 'contains', value: '15,000', points: 15, active: true },
          { name: 'Budget above $50K', field: 'budget_range', operator: 'contains', value: '50,000', points: 25, active: true },
          { name: 'Event within 30 days', field: 'event_date', operator: 'date_before', value: '30', points: 20, active: true },
          { name: 'Expected guests above 500', field: 'expected_guests', operator: 'greater_than', value: '500', points: 10, active: true },
          { name: 'Venue already booked', field: 'venue_status', operator: 'equals', value: 'Already Booked', points: 15, active: true },
          { name: 'Full service needed', field: 'services_needed', operator: 'equals', value: 'Full Event Marketing', points: 15, active: true },
          { name: 'Sponsorship interest', field: 'sponsor_interest', operator: 'equals', value: 'true', points: 10, active: true },
          { name: 'Urgent timeline', field: 'decision_timeline', operator: 'contains', value: 'Immediate', points: 20, active: true },
          { name: 'WhatsApp preferred', field: 'preferred_contact_channel', operator: 'equals', value: 'WhatsApp', points: 5, active: true },
          { name: 'No budget decided', field: 'budget_range', operator: 'equals', value: 'Not Decided', points: -10, active: true },
        ],
      },
    },
    routing_rules: {
      type: 'routing_rules',
      name: 'Event Agency Routing',
      order: 6,
      payload: {
        rules: [
          { name: 'High budget → Senior', conditions: { budget_range: '50,000' }, action: { assign_to_role: 'MANAGER', priority: 'high' } },
          { name: 'Sponsorship → Partnerships', conditions: { sponsor_interest: 'true' }, action: { assign_to_role: 'MANAGER', tag: 'sponsorship' } },
          { name: 'Urgent → Fast track', conditions: { decision_timeline: 'Immediate' }, action: { assign_to_role: 'MANAGER', tag: 'urgent' } },
          { name: 'Ticketing → Performance', conditions: { ticketing_needed: 'true' }, action: { assign_to_role: 'SALES_AGENT', tag: 'ticketing' } },
        ],
      },
    },
    message_templates: {
      type: 'message_templates',
      name: 'Event Agency Messages',
      order: 7,
      payload: {
        templates: [
          { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! 👋 Thanks for your interest in event marketing services. We would love to learn more about your {{customFields.event_type}} event. When is a good time to chat?', active: true },
          { name: 'Missing Details Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, to send you the best proposal, we need a few more details about your {{customFields.event_type}}. Can you share: event date, expected guests, and budget range? 📋', active: true },
          { name: 'Consultation Booking Invite', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! Ready to discuss your {{customFields.event_type}}? Book a free 30-min strategy call here: {{booking.link}} 🗓️', active: true },
          { name: 'Proposal Request Confirmation', type: 'FOLLOW_UP', channel: 'EMAIL', body: 'Hi {{contact.name}}, we have received your proposal request for {{customFields.event_type}}. Our team will prepare a custom proposal within 24-48 hours. Stay tuned!', active: true },
          { name: 'Event Date Urgent Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your {{customFields.event_type}} is coming up soon! ⏰ Let us finalize the marketing plan quickly. Reply YES to get priority.', active: true },
          { name: 'Budget Clarification', type: 'QUALIFICATION_QUESTION', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, to tailor our proposal for your {{customFields.event_type}}, could you share your approximate budget range? This helps us recommend the right package. 💰', active: true },
          { name: 'No Response Follow-up', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, checking in about your {{customFields.event_type}} inquiry. Still interested? We are happy to answer any questions! 😊', active: true },
          { name: 'Reactivation (30 days)', type: 'RECONNECT', channel: 'EMAIL', body: 'Hi {{contact.name}}, we noticed you inquired about event marketing for a {{customFields.event_type}} a while ago. Do you have any upcoming events? We would love to help!', active: true },
          { name: 'Booked Confirmation', type: 'THANK_YOU', channel: 'WHATSAPP', body: 'Great news {{contact.name}}! 🎉 Your {{customFields.event_type}} marketing campaign is confirmed. We will share the detailed plan and next steps shortly.', active: true },
          { name: 'Lost Lead Feedback', type: 'RECONNECT', channel: 'EMAIL', body: 'Hi {{contact.name}}, we noticed you went with another option for your {{customFields.event_type}}. Would you mind sharing what influenced your decision? Your feedback helps us improve. 🙏', active: true },
        ],
      },
    },
    nurture_sequences: {
      type: 'nurture_sequences',
      name: 'Event Agency Nurture',
      order: 8,
      payload: {
        sequences: [
          { name: 'New Event Inquiry Nurture', active: true, steps: [
            { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
            { type: 'CHECK_CONDITION', displayOrder: 3, config: { field: 'event_date', exists: true }, waitSeconds: 0 },
            { type: 'SEND_WHATSAPP', displayOrder: 4, config: { template: 'Consultation Booking Invite' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 5, waitSeconds: 259200 },
            { type: 'UPDATE_LEAD_STATUS', displayOrder: 6, config: { status: 'CONTACTED' }, waitSeconds: 0 },
          ]},
          { name: 'Proposal Follow-up Sequence', active: true, steps: [
            { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Proposal Request Confirmation' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 2, waitSeconds: 172800 },
            { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Budget Clarification' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 4, waitSeconds: 259200 },
            { type: 'SEND_WHATSAPP', displayOrder: 5, config: { template: 'No Response Follow-up' }, waitSeconds: 0 },
          ]},
          { name: 'Urgent Event Fast-Track', active: true, steps: [
            { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'Event Date Urgent Follow-up' }, waitSeconds: 0 },
            { type: 'NOTIFY_TEAM', displayOrder: 2, config: { channel: 'WhatsApp', priority: 'high' }, waitSeconds: 0 },
            { type: 'CREATE_TASK', displayOrder: 3, config: { title: 'Call urgently', priority: 'high' }, waitSeconds: 0 },
          ]},
          { name: 'Sponsorship Lead Nurture', active: true, steps: [
            { type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },
            { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Consultation Booking Invite' }, waitSeconds: 0 },
          ]},
          { name: 'Cold Lead Reconnect', active: true, steps: [
            { type: 'SEND_EMAIL', displayOrder: 1, config: { template: 'Reactivation (30 days)' }, waitSeconds: 0 },
            { type: 'WAIT', displayOrder: 2, waitSeconds: 604800 },
            { type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'No Response Follow-up' }, waitSeconds: 0 },
          ]},
        ],
      },
    },
    booking_settings: {
      type: 'booking_settings',
      name: 'Event Agency Booking',
      order: 9,
      payload: {
        settings: [
          { name: '15-min Qualification Call', provider: 'calendly', config: { duration: 15, title: 'Event Marketing Qualification Call' } },
          { name: '30-min Strategy Call', provider: 'calendly', config: { duration: 30, title: 'Event Marketing Strategy Session' } },
          { name: '45-min Proposal Review', provider: 'calendly', config: { duration: 45, title: 'Proposal Review Meeting' } },
        ],
      },
    },
    crm_mappings: {
      type: 'crm_mappings',
      name: 'Event Agency CRM Mapping',
      order: 10,
      payload: {
        mappings: [
          { name: 'Standard Event Lead Mapping', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.event_type': 'event_type__c', 'customFields.event_date': 'event_date__c', 'customFields.budget_range': 'budget_range__c', 'customFields.expected_guests': 'guest_count__c', 'customFields.venue_status': 'venue_status__c', source: 'lead_source__c', status: 'pipeline_stage__c' } },
        ],
      },
    },
    conversion_goals: {
      type: 'conversion_goals',
      name: 'Event Agency Conversions',
      order: 11,
      payload: {
        goals: [
          { destination: 'APPOINTMENT_BOOKING', name: 'Consultation Booked' },
          { destination: 'QUOTE_REQUEST', name: 'Proposal Requested' },
          { destination: 'CRM_QUALIFIED_PUSH', name: 'CRM Push' },
          { destination: 'ORDER_BOOKING', name: 'Event Marketing Booked' },
          { destination: 'PURCHASE_ONLINE', name: 'Retainer Paid' },
        ],
      },
    },
    dashboard_labels: {
      type: 'dashboard_labels',
      name: 'Event Agency Labels',
      order: 12,
      payload: {
        labels: {
          lead: 'Event Lead',
          leads: 'Event Leads',
          campaign: 'Event Campaign',
          campaigns: 'Event Campaigns',
          conversion: 'Booking',
          pipeline: 'Event Pipeline',
          booking: 'Strategy Call',
        },
      },
    },
    reports: {
      type: 'reports',
      name: 'Event Agency Reports',
      order: 13,
      payload: {
        reports: [
          { name: 'Leads by Campaign', type: 'leads_by_campaign' },
          { name: 'Bookings by Campaign', type: 'conversions_by_campaign' },
          { name: 'Quote Requests by Source', type: 'quotes_by_source' },
          { name: 'Revenue by Event Type', type: 'revenue_by_custom_field', config: { field: 'event_type' } },
          { name: 'Hot Leads Needing Follow-up', type: 'hot_leads' },
          { name: 'Proposals Sent Not Booked', type: 'stalled_pipeline', config: { stage: 'Proposal Sent' } },
        ],
      },
    },
  },
};
