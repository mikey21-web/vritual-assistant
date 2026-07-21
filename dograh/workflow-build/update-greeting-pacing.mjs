// Patches comma/ellipsis pacing into the Telugu greeting (startCall node) of the
// existing workflow, to slow down TTS cadence — same fix validated on OmniDimension.
// Safe to re-run.

const baseUrl = process.env.DOGRAH_API_URL || 'http://localhost:8010';
const apiKey = process.env.DOGRAH_API_KEY;
const workflowId = process.env.DOGRAH_WORKFLOW_ID || '4';

const NEW_GREETING =
  'Namaskaram... {{first_name}} garu. Nenu, Sunshine Properties nundi, Riya matladutunnanu. ' +
  'Meeru ఇటీవల, మా property గురించి, chusaru kada? ...Rendu minutes, matladagalara?';

const res = await fetch(`${baseUrl}/api/v1/workflow/fetch/${workflowId}`, {
  headers: { 'X-API-Key': apiKey },
});
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
const wf = await res.json();
const def = wf.workflow_definition;

let patched = false;
for (const node of def.nodes) {
  if (node.type === 'startCall') {
    node.data.greeting = NEW_GREETING;
    patched = true;
  }
}
console.log('greeting patched:', patched);

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
