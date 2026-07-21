import { DograhClient, Workflow } from '@dograh/sdk';

const client = new DograhClient({
  baseUrl: process.env.DOGRAH_API_URL || 'http://localhost:8010',
  apiKey: process.env.DOGRAH_API_KEY,
});

const wf = new Workflow({ client, name: 'real-estate-lead-qualifier-en' });

const persona = await wf.add({
  type: 'globalNode',
  name: 'persona',
  prompt:
    'You are Riya, a warm and professional real estate lead qualifier for Sunshine Properties. ' +
    'Keep responses SHORT - this is a phone call. Ask ONE question at a time. ' +
    'Be conversational, not robotic. Never pressure the customer.',
});

const start = await wf.add({
  type: 'startCall',
  name: 'greeting',
  add_global_prompt: true,
  greeting_type: 'text',
  greeting: 'Hi {{first_name}}, this is Riya from Sunshine Properties. You recently checked out our property ad - do you have a couple of minutes to chat?',
  prompt:
    'Confirm they are the right person and have a couple of minutes. ' +
    'If they say this is a wrong number, acknowledge and prepare to end the call politely. ' +
    'If they are busy, offer to call back later and prepare to end the call politely. ' +
    'If they confirm interest and have time, move on to ask about property type.',
  extraction_enabled: true,
  extraction_variables: [
    { name: 'call_status', type: 'string', prompt: "one of: 'interested', 'busy', 'wrong_number'" },
  ],
});

const propertyType = await wf.add({
  type: 'agentNode',
  name: 'property_type',
  add_global_prompt: true,
  prompt: 'Ask whether they are looking for an apartment/flat, a villa/house, or land/plot.',
  extraction_enabled: true,
  extraction_variables: [{ name: 'property_type', type: 'string', prompt: 'apartment, villa, or plot' }],
});

const area = await wf.add({
  type: 'agentNode',
  name: 'area',
  add_global_prompt: true,
  prompt: 'Ask their preferred area or locality for the property.',
  extraction_enabled: true,
  extraction_variables: [{ name: 'area', type: 'string', prompt: 'preferred locality/area name' }],
});

const bedrooms = await wf.add({
  type: 'agentNode',
  name: 'bedrooms',
  add_global_prompt: true,
  prompt: 'If they want an apartment or villa, ask how many bedrooms they need (1BHK, 2BHK, or 3BHK). If they said plot/land, skip this and move straight to budget.',
  extraction_enabled: true,
  extraction_variables: [{ name: 'bhk', type: 'string', prompt: '1BHK, 2BHK, 3BHK, or not applicable for plots' }],
});

const budget = await wf.add({
  type: 'agentNode',
  name: 'budget',
  add_global_prompt: true,
  prompt: 'Ask their approximate budget range.',
  extraction_enabled: true,
  extraction_variables: [{ name: 'budget', type: 'string', prompt: 'approximate budget range mentioned by caller' }],
});

const timeline = await wf.add({
  type: 'agentNode',
  name: 'timeline',
  add_global_prompt: true,
  prompt: 'Ask when they plan to buy: immediately, within 3 months, within 6 months, or just browsing with no timeline.',
  extraction_enabled: true,
  extraction_variables: [{ name: 'timeline', type: 'string', prompt: 'immediate, 3_months, 6_months, or just_browsing' }],
});

const loan = await wf.add({
  type: 'agentNode',
  name: 'loan',
  add_global_prompt: true,
  prompt: 'Ask if they will need a home loan or are using their own funds. Then offer to arrange a site visit.',
  extraction_enabled: true,
  extraction_variables: [
    { name: 'needs_loan', type: 'boolean', prompt: 'true if they need a home loan' },
    { name: 'wants_site_visit', type: 'boolean', prompt: 'true if they agreed to a site visit' },
  ],
});

const qualified = await wf.add({
  type: 'endCall',
  name: 'qualified_hot_lead',
  add_global_prompt: true,
  prompt: 'Thank them warmly for their time. Tell them the team will contact them shortly with the best options and to confirm the site visit.',
});

const callbackLater = await wf.add({
  type: 'endCall',
  name: 'callback_later_warm_lead',
  add_global_prompt: true,
  prompt: 'Thank them for their time. Let them know the team will follow up later, once they have discussed with their family or firmed up their plans.',
});

const notInterested = await wf.add({
  type: 'endCall',
  name: 'not_interested_cold_lead',
  add_global_prompt: true,
  prompt: 'Thank them politely for their time and end the call without pressuring them further.',
});

const wrongNumberOrBusy = await wf.add({
  type: 'endCall',
  name: 'wrong_number_or_busy',
  add_global_prompt: true,
  prompt: 'If wrong number: apologize briefly and end the call. If busy: confirm you will call back later and end the call politely.',
});

const outcomeWebhook = await wf.add({
  type: 'webhook',
  name: 'post_call_outcome',
  http_method: 'POST',
  endpoint_url: process.env.OUTCOME_WEBHOOK_URL || 'http://host.docker.internal:3001/voice-agent/webhook/call-completed',
  custom_headers: [{ key: 'X-Webhook-Secret', value: process.env.OUTCOME_WEBHOOK_SECRET || '' }],
  payload_template: {
    call_sid: '{{workflow_run_id}}',
    lead_id: '{{initial_context.lead_id}}',
    status: 'completed',
    outcome: {
      call_status: '{{gathered_context.call_status}}',
      property_type: '{{gathered_context.property_type}}',
      area: '{{gathered_context.area}}',
      bhk: '{{gathered_context.bhk}}',
      budget: '{{gathered_context.budget}}',
      timeline: '{{gathered_context.timeline}}',
      needs_loan: '{{gathered_context.needs_loan}}',
      wants_site_visit: '{{gathered_context.wants_site_visit}}',
    },
  },
});

// Happy path
wf.edge(start, propertyType, { label: 'interested', condition: "call_status is 'interested'" });
wf.edge(start, wrongNumberOrBusy, { label: 'busy_or_wrong_number', condition: "call_status is 'busy' or 'wrong_number'" });
wf.edge(propertyType, area, { label: 'next', condition: 'Property type captured.' });
wf.edge(area, bedrooms, { label: 'next', condition: 'Area captured.' });
wf.edge(bedrooms, budget, { label: 'next', condition: 'Bedrooms captured or not applicable (plot).' });
wf.edge(budget, timeline, { label: 'next', condition: 'Budget captured.' });
wf.edge(timeline, loan, { label: 'next', condition: 'Timeline captured.' });

// Outcome branches from loan node
wf.edge(loan, qualified, { label: 'hot', condition: "timeline is 'immediate' or '3_months' and wants_site_visit is true" });
wf.edge(loan, callbackLater, { label: 'warm', condition: "timeline is '6_months' or caller wants to discuss with family first" });
wf.edge(loan, notInterested, { label: 'cold', condition: "timeline is 'just_browsing' with no clear intent" });

// The webhook node fires automatically once the workflow run completes -
// it isn't wired via edges (EndCall nodes can't have outgoing edges, and
// Webhook nodes can't have incoming edges).

const created = await client.createWorkflow({ body: { name: wf.name, workflow_definition: wf.toJson() } });
console.log('Created workflow id:', created.id, 'uuid:', created.workflow_uuid);

const baseUrl = process.env.DOGRAH_API_URL || 'http://localhost:8010';
const publishRes = await fetch(`${baseUrl}/api/v1/workflow/${created.id}/publish`, {
  method: 'POST',
  headers: { 'X-API-Key': process.env.DOGRAH_API_KEY },
});
console.log('Publish status:', publishRes.status);
const publishBody = await publishRes.text();
console.log('Publish body:', publishBody);

console.log(JSON.stringify({ id: created.id, workflow_uuid: created.workflow_uuid }));
