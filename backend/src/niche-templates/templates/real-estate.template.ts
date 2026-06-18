export const realEstateTemplate = {
  key: 'real-estate',
  name: 'Real Estate Agency',
  description: 'Lead capture and qualification system for real estate agencies and property developers. Tracks property type, budget, financing status, and site visit interest.',
  industry: 'real_estate',
  version: 1,
  packs: {
    customFields: { type: 'custom_fields', name: 'Real Estate Fields', order: 1, payload: { fields: [
      { name: 'Property Type', key: 'property_type', type: 'DROPDOWN', target: 'LEAD', options: ['Apartment','Villa','Townhouse','Penthouse','Plot','Commercial','Office','Warehouse'], required: true, displayOrder: 1 },
      { name: 'Location', key: 'location', type: 'TEXT', target: 'LEAD', required: true, displayOrder: 2 },
      { name: 'Budget', key: 'budget', type: 'NUMBER', target: 'LEAD', required: false, displayOrder: 3 },
      { name: 'Buy/Rent', key: 'buy_rent', type: 'DROPDOWN', target: 'LEAD', options: ['Buy','Rent','Both'], required: true, displayOrder: 4 },
      { name: 'Bedrooms', key: 'bedrooms', type: 'DROPDOWN', target: 'LEAD', options: ['1','2','3','4','5+'], required: false, displayOrder: 5 },
      { name: 'Move-in Timeline', key: 'move_in_timeline', type: 'DROPDOWN', target: 'LEAD', options: ['Immediate','Within 1 month','1-3 months','3-6 months','6+ months'], required: false, displayOrder: 6 },
      { name: 'Financing Status', key: 'financing_status', type: 'DROPDOWN', target: 'LEAD', options: ['Pre-approved','Looking','Cash','Not Started'], required: false, displayOrder: 7 },
      { name: 'Site Visit Interest', key: 'site_visit', type: 'BOOLEAN', target: 'LEAD', required: false, displayOrder: 8 },
    ]}},
    lead_forms: { type: 'lead_forms', name: 'Property Inquiry Forms', order: 2, payload: { forms: [
      { name: 'Property Inquiry', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Email', fieldKey: 'email', type: 'email', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Property Type', fieldKey: 'property_type', type: 'dropdown', required: true },{ label: 'Budget', fieldKey: 'budget', type: 'number', required: false },{ label: 'Message', fieldKey: 'message', type: 'text', required: false }] },
      { name: 'Site Visit Request', active: true, fields: [{ label: 'Full Name', fieldKey: 'name', type: 'text', required: true },{ label: 'Phone', fieldKey: 'phone', type: 'tel', required: true },{ label: 'Preferred Date', fieldKey: 'preferred_date', type: 'date', required: true },{ label: 'Property Type', fieldKey: 'property_type', type: 'dropdown', required: true }] },
    ]}},
    campaigns: { type: 'campaigns', name: 'Real Estate Campaigns', order: 3, payload: { campaigns: [
      { name: 'New Launch Campaign', sourceType: 'SOCIAL_MEDIA', active: true },
      { name: 'Open House Leads', sourceType: 'QR_CODE', active: true },
      { name: 'Property Listing Ads', sourceType: 'FORM', active: true },
      { name: 'Referral Campaign', sourceType: 'WHATSAPP', active: true },
    ]}},
    pipeline_stages: { type: 'pipeline_stages', name: 'Real Estate Pipeline', order: 4, payload: { stages: [
      { name: 'New Lead', order: 1, color: '#6b7280', isDefault: true }, { name: 'Contacted', order: 2, color: '#3b82f6' }, { name: 'Site Visit Scheduled', order: 3, color: '#8b5cf6' }, { name: 'Site Visit Done', order: 4, color: '#10b981' }, { name: 'Property Shortlisted', order: 5, color: '#f59e0b' }, { name: 'Negotiation', order: 6, color: '#14b8a6' }, { name: 'Deal Closed', order: 7, color: '#22c55e', isEnd: true }, { name: 'Lost', order: 8, color: '#ef4444', isEnd: true },
    ]}},
    scoring_rules: { type: 'scoring_rules', name: 'Real Estate Scoring', order: 5, payload: { rules: [
      { name: 'Pre-approved financing', field: 'financing_status', operator: 'equals', value: 'Pre-approved', points: 25, active: true },
      { name: 'Immediate move-in', field: 'move_in_timeline', operator: 'equals', value: 'Immediate', points: 20, active: true },
      { name: 'Site visit requested', field: 'site_visit', operator: 'equals', value: 'true', points: 15, active: true },
    ]}},
    message_templates: { type: 'message_templates', name: 'Real Estate Messages', order: 6, payload: { templates: [
      { name: 'First Response', type: 'WELCOME', channel: 'WHATSAPP', body: 'Hi {{contact.name}}! Thanks for your interest in our properties. Which area and property type are you looking for? 🏠', active: true },
      { name: 'Site Visit Confirmation', type: 'APPOINTMENT_LINK', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, your site visit is confirmed! Book your preferred time: {{booking.link}} 🗓️', active: true },
      { name: 'Follow-up After Visit', type: 'FOLLOW_UP', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, hope you liked the property! Any questions after the visit? We are happy to help. 😊', active: true },
      { name: 'Financing Follow-up', type: 'QUALIFICATION_QUESTION', channel: 'WHATSAPP', body: 'Hi {{contact.name}}, have you started the financing process? We can connect you with our mortgage partners if needed.', active: true },
    ]}},
    nurture_sequences: { type: 'nurture_sequences', name: 'Real Estate Nurture', order: 7, payload: { sequences: [
      { name: 'New Property Inquiry', active: true, steps: [{ type: 'SEND_WHATSAPP', displayOrder: 1, config: { template: 'First Response' }, waitSeconds: 0 },{ type: 'WAIT', displayOrder: 2, waitSeconds: 86400 },{ type: 'SEND_WHATSAPP', displayOrder: 3, config: { template: 'Site Visit Confirmation' }, waitSeconds: 0 }] },
    ]}},
    booking_settings: { type: 'booking_settings', name: 'Site Visit Booking', order: 8, payload: { settings: [
      { name: 'Site Visit Appointment', provider: 'calendly', config: { duration: 30, title: 'Property Site Visit' } },
    ]}},
    crm_mappings: { type: 'crm_mappings', name: 'Real Estate CRM', order: 9, payload: { mappings: [
      { name: 'Standard Property Lead', crmType: 'hubspot', active: true, fieldMappings: { name: 'firstname', email: 'email', phone: 'phone', 'customFields.property_type': 'property_type__c', 'customFields.budget': 'budget__c', 'customFields.location': 'location__c' } },
    ]}},
    conversion_goals: { type: 'conversion_goals', name: 'Real Estate Conversions', order: 10, payload: { goals: [
      { destination: 'APPOINTMENT_BOOKING', name: 'Site Visit Booked' }, { destination: 'QUOTE_REQUEST', name: 'Quote Requested' }, { destination: 'CRM_QUALIFIED_PUSH', name: 'CRM Push' }, { destination: 'PURCHASE_ONLINE', name: 'Deal Closed' },
    ]}},
    dashboard_labels: { type: 'dashboard_labels', name: 'Real Estate Labels', order: 11, payload: { labels: { lead: 'Property Lead', leads: 'Property Leads', campaign: 'Listing Campaign', conversion: 'Deal Closed', pipeline: 'Sales Pipeline', booking: 'Site Visit' } } },
  },
};
