// Batch-fix n8n workflows: retry + error handling + auth standardization
const fs = require('fs');
const path = require('path');

const dir = __dirname;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const wf = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  let nodeCount = wf.nodes.length;

  // Find existing node names to generate unique IDs
  const existingIds = new Set(wf.nodes.map(n => n.id));

  // Standardize auth on all HTTP Request nodes
  for (const node of wf.nodes) {
    if (node.type !== 'n8n-nodes-base.httpRequest') continue;

    // Fix auth: standardize to expression syntax ={{ }}
    if (node.parameters?.headerAuth?.value && node.parameters.headerAuth.value.includes('Bearer ') && !node.parameters.headerAuth.value.startsWith('=')) {
      const tokenRef = node.parameters.headerAuth.value.replace('Bearer ', '').trim();
      node.parameters.headerAuth.value = `={{ 'Bearer ' + $env.N8N_BACKEND_JWT }}`;
    }

    // Add retry options
    if (!node.parameters.options) node.parameters.options = {};
    node.parameters.options.retryOnFail = true;
    node.parameters.options.maxTries = node.parameters.options.maxTries || 3;
    node.parameters.options.waitBetweenTries = node.parameters.options.waitBetweenTries || 5000;
  }

  // Add error-handling for each HTTP Request node and "failure-log" Code node
  // Strategy: add a single shared failure-log Code node, and error branches to it
  const failureInboxId = 'failure-inbox-' + file.replace('.json', '');
  const failureCodeId = 'failure-code-' + file.replace('.json', '');
  const hasFailureNode = wf.nodes.some(n => n.id === failureCodeId);

  if (!hasFailureNode) {
    wf.nodes.push({
      parameters: {
        jsCode: `// Log failure to backend
const input = $input.all();
const errorInfo = input[0]?.json || {};
const lastNode = $items('{{ $node.name }}').last();
return {
  eventType: 'n8n_workflow_failure',
  workflow: '${file.replace('.json', '')}',
  timestamp: new Date().toISOString(),
  error: lastNode?.json?.message || JSON.stringify(errorInfo),
  payload: errorInfo
};`
      },
      id: failureCodeId,
      name: 'Log Failure',
      type: 'n8n-nodes-base.code',
      position: [Math.max(...wf.nodes.map(n => n.position[0])) + 400, 600]
    });

    // Try to POST error to backend
    wf.nodes.push({
      parameters: {
        method: 'POST',
        url: `={{ $env.N8N_BACKEND_API_URL }}/advanced-features/failure-inbox`,
        sendBody: true,
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        headerAuth: { name: 'Authorization', value: `={{ 'Bearer ' + $env.N8N_BACKEND_JWT }}` },
        bodyParameters: {
          parameters: [
            { name: 'eventType', value: '={{ $json.eventType }}' },
            { name: 'error', value: '={{ $json.error }}' },
            { name: 'payload', value: '={{ JSON.stringify($json) }}' }
          ]
        },
        options: { retryOnFail: true, maxTries: 2, waitBetweenTries: 3000 }
      },
      id: failureInboxId,
      name: 'Report to Backend',
      type: 'n8n-nodes-base.httpRequest',
      position: [Math.max(...wf.nodes.map(n => n.position[0])) + 600, 600]
    });
  }

  wf.connections['Log Failure'] = { main: [[{ node: 'Report to Backend', type: 'main', index: 0 }]] };

  // Add error connections from HTTP nodes to Log Failure
  for (const node of wf.nodes) {
    if (node.type !== 'n8n-nodes-base.httpRequest' || node.id === failureInboxId) continue;
    const key = node.name || node.id;
    if (!wf.connections[key]) wf.connections[key] = {};
    wf.connections[key].error = [[{ node: 'Log Failure', type: 'main', index: 0 }]];
  }

  nodeCount = wf.nodes.length;
  fs.writeFileSync(path.join(dir, file), JSON.stringify(wf, null, 2), 'utf8');
  console.log(`${file}: ${nodeCount} nodes, retry+error added`);
}
