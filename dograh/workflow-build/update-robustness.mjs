// Patches conversation-robustness content into the existing real-estate workflow
// (id=3): anti-early-hangup guard on the global persona, and an explicit
// end-call checklist on every endCall node. Run after build.mjs has created the
// workflow once; safe to re-run (idempotent overwrite of the same fields).

const baseUrl = process.env.DOGRAH_API_URL || 'http://localhost:8010';
const apiKey = process.env.DOGRAH_API_KEY;
const workflowId = process.env.DOGRAH_WORKFLOW_ID || '3';

const res = await fetch(`${baseUrl}/api/v1/workflow/fetch/${workflowId}`, {
  headers: { 'X-API-Key': apiKey },
});
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
const wf = await res.json();
const def = wf.workflow_definition;

const PERSONA_HANGUP_GUARD =
  ' Do not end the call or mark the lead as not interested within the first 10 seconds ' +
  'of the conversation unless the caller is clearly hostile or has hung up - a hesitant ' +
  '"who is this?" or a slow start is not a reason to give up on the call.';

const END_CALL_CHECKLIST =
  ' Before saying goodbye: (1) confirm the caller has no more questions, ' +
  '(2) give them one clear summary line of what happens next, (3) then say goodbye.';

let personaPatched = false;
let endCallsPatched = 0;

for (const node of def.nodes) {
  if (node.type === 'globalNode' && !node.data.prompt.includes('Do not end the call')) {
    node.data.prompt += PERSONA_HANGUP_GUARD;
    personaPatched = true;
  }
  if (node.type === 'endCall' && !node.data.prompt.includes('Before saying goodbye')) {
    node.data.prompt += END_CALL_CHECKLIST;
    endCallsPatched++;
  }
}

console.log('persona patched:', personaPatched, '| endCall nodes patched:', endCallsPatched);

const putRes = await fetch(`${baseUrl}/api/v1/workflow/${workflowId}`, {
  method: 'PUT',
  headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: wf.name, workflow_definition: def }),
});
console.log('PUT status:', putRes.status);
if (!putRes.ok) throw new Error(await putRes.text());

const publishRes = await fetch(`${baseUrl}/api/v1/workflow/${workflowId}/publish`, {
  method: 'POST',
  headers: { 'X-API-Key': apiKey },
});
console.log('Publish status:', publishRes.status, await publishRes.text());
