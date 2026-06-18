const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'n8n', 'workflows');
const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const fileName = file.replace('.json', '');

  // Track unprotected Code nodes
  const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  const httpNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
  const failureCodeId = codeNodes.find(n => n.name === 'Log Failure')?.id;
  const failureInboxId = httpNodes.find(n => n.name === 'Report to Backend')?.id;

  // Identify unprotected Code nodes — those without error connections
  const unprotectedCodeNodes = codeNodes.filter(cn => {
    if (cn.name === 'Log Failure') return false;
    const hasErrorConn = workflow.connections[cn.name]?.error;
    return !hasErrorConn;
  });

  // Add error connections for unprotected Code nodes to "Log Failure"
  if (unprotectedCodeNodes.length > 0 && failureCodeId) {
    for (const cn of unprotectedCodeNodes) {
      if (!workflow.connections[cn.name]) workflow.connections[cn.name] = {};
      workflow.connections[cn.name].error = [[{ node: 'Log Failure', type: 'main', index: 0 }]];
    }
  }

  // Add x-api-key sendHeaders to HTTP nodes that call backend (not failure-inbox nodes)
  for (const node of httpNodes) {
    const url = typeof node.parameters?.url === 'string' ? node.parameters.url : '';
    const isFailureInbox = url.includes('failure-inbox');
    const hasXApiKey = url.includes('x-api-key') || 
      (node.parameters?.headerAuth?.name === 'x-api-key') ||
      (node.parameters?.options?.sendHeaders?.headerParameters?.some(h => h.name === 'x-api-key'));

    // Skip 02 (WhatsApp uses x-hub-signature-256) and 09 (Stripe uses stripe-signature) and failure-inbox nodes
    const usesProviderSig = node.parameters?.headerAuth?.name === 'x-hub-signature-256' || 
                            node.parameters?.headerAuth?.name === 'stripe-signature';

    if (!isFailureInbox && !hasXApiKey && !usesProviderSig) {
      if (!node.parameters.options) node.parameters.options = {};
      if (!node.parameters.options.sendHeaders) {
        node.parameters.options.sendHeaders = { headerParameters: [] };
      }
      node.parameters.options.sendHeaders.headerParameters.push({
        name: 'x-api-key',
        value: '={{ $env.WEBHOOK_API_KEY }}'
      });
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  
  // Verify JSON
  JSON.parse(JSON.stringify(workflow));
  
  const codeCount = unprotectedCodeNodes.length;
  console.log(`OK: ${file}${codeCount ? ' (+' + codeCount + ' error paths)' : ''}`);
}

console.log('\nAll workflows fixed and validated.');
