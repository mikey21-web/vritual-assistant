// Adds a dedicated "voicemail" endCall node + edge from the startCall node,
// gated on gathered_context.answered_by (populated by Twilio AMD once
// amd_enabled:true is set on the telephony config). Safe to re-run - skips if
// the node already exists.

const baseUrl = process.env.DOGRAH_API_URL || 'http://localhost:8010';
const apiKey = process.env.DOGRAH_API_KEY;
const workflowId = process.env.DOGRAH_WORKFLOW_ID || '3';

const res = await fetch(`${baseUrl}/api/v1/workflow/fetch/${workflowId}`, {
  headers: { 'X-API-Key': apiKey },
});
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
const wf = await res.json();
const def = wf.workflow_definition;

if (def.nodes.some((n) => n.data.name === 'voicemail')) {
  console.log('voicemail node already exists, nothing to do');
  process.exit(0);
}

const startNode = def.nodes.find((n) => n.type === 'startCall');
const maxId = Math.max(...def.nodes.map((n) => parseInt(n.id, 10)));
const voicemailNodeId = String(maxId + 1);

def.nodes.push({
  id: voicemailNodeId,
  type: 'endCall',
  position: { x: 0, y: 0 },
  data: {
    name: 'voicemail',
    prompt: 'Leave a brief, friendly message: mention Sunshine Properties called about their property inquiry and that the team will try again later. Keep it under 10 seconds worth of speech.',
    add_global_prompt: false,
  },
});

def.edges.push({
  id: `${startNode.id}-${voicemailNodeId}`,
  source: startNode.id,
  target: voicemailNodeId,
  data: {
    label: 'voicemail',
    condition: "answered_by is 'machine_start', 'machine_end_beep', 'machine_end_silence', 'machine_end_other', or 'fax'",
  },
});

console.log('added voicemail node', voicemailNodeId, 'with edge from', startNode.id);

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
