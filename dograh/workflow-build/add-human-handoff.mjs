// Adds IVR "talk to a human" handoff: a `wants_human` extraction variable on
// every conversational node (so it can be detected at any point in the call,
// not just at one fixed step), a dedicated endCall node acknowledging the
// request, and a conditional edge from each conversational node to it. Also
// posts a note to the persona/global prompt so the agent never argues about
// it. Safe to re-run - skips work already done.

const baseUrl = process.env.DOGRAH_API_URL || 'http://localhost:8010';
const apiKey = process.env.DOGRAH_API_KEY;
const workflowId = process.env.DOGRAH_WORKFLOW_ID || '3';
const language = process.env.WORKFLOW_LANG || 'en';

const HUMAN_HANDOFF_MESSAGE = language === 'te'
  ? 'Sare! Nenu mana team member ni meeku thondarga call cheyamani cheputanu. Meeru wait chesinandhuku thanks!'
  : "Of course! I'll have someone from our team call you back shortly. Thanks for your patience!";

const PERSONA_NOTE = ' If the caller explicitly asks to speak with a human, a real person, or your manager/team instead of continuing with you, acknowledge warmly and do not argue or keep qualifying - hand off immediately.';

const res = await fetch(`${baseUrl}/api/v1/workflow/fetch/${workflowId}`, {
  headers: { 'X-API-Key': apiKey },
});
if (!res.ok) throw new Error(`fetch failed: ${res.status} ${await res.text()}`);
const wf = await res.json();
const def = wf.workflow_definition;

let handoffNodeId = def.nodes.find((n) => n.data.name === 'human_handoff')?.id;
let created = false;

if (!handoffNodeId) {
  const maxId = Math.max(...def.nodes.map((n) => parseInt(n.id, 10)));
  handoffNodeId = String(maxId + 1);
  def.nodes.push({
    id: handoffNodeId,
    type: 'endCall',
    position: { x: 0, y: 0 },
    data: {
      name: 'human_handoff',
      prompt: HUMAN_HANDOFF_MESSAGE,
      add_global_prompt: false,
    },
  });
  created = true;
}

const globalNode = def.nodes.find((n) => n.type === 'globalNode');
if (globalNode && !globalNode.data.prompt.includes('speak with a human')) {
  globalNode.data.prompt += PERSONA_NOTE;
}

const webhookNode = def.nodes.find((n) => n.type === 'webhook');
let webhookPatched = false;
if (webhookNode && webhookNode.data.payload_template?.outcome && !('wants_human' in webhookNode.data.payload_template.outcome)) {
  webhookNode.data.payload_template.outcome.wants_human = '{{gathered_context.wants_human}}';
  webhookPatched = true;
}

let fieldsAdded = 0;
let edgesAdded = 0;
for (const node of def.nodes) {
  if (node.type !== 'agentNode' && node.type !== 'startCall') continue;

  node.data.extraction_enabled = true;
  node.data.extraction_variables = node.data.extraction_variables || [];
  if (!node.data.extraction_variables.some((v) => v.name === 'wants_human')) {
    node.data.extraction_variables.push({ name: 'wants_human', type: 'boolean', prompt: 'The caller explicitly asked to speak with a human agent or a real person instead of continuing with the AI.' });
    fieldsAdded++;
  }

  const edgeId = `${node.id}-${handoffNodeId}-human`;
  if (!def.edges.some((e) => e.id === edgeId)) {
    def.edges.push({ id: edgeId, source: node.id, target: handoffNodeId, data: { label: 'wants human', condition: 'wants_human is true' } });
    edgesAdded++;
  }
}

console.log('handoff node created:', created, '| fields added:', fieldsAdded, '| edges added:', edgesAdded, '| webhook patched:', webhookPatched);

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
