// Script to fix all 12 n8n workflow JSON files
const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, 'workflows');

const files = fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(WORKFLOWS_DIR, file);
  const workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Add sendHeaders with x-api-key to HTTP Request nodes (except failure inbox nodes)
  for (const node of workflow.nodes) {
    if (node.type === 'n8n-nodes-base.httpRequest') {
      // Skip failure inbox nodes (they need Bearer JWT for /advanced-features/failure-inbox)
      const url = node.parameters?.url || '';
      const isFailureInbox = url.includes('failure-inbox') || url.includes('record-failure');
      
      if (!isFailureInbox) {
        // Add sendHeaders with x-api-key
        if (!node.parameters.options) node.parameters.options = {};
        if (!node.parameters.options.sendHeaders) {
          node.parameters.options.sendHeaders = {
            headerParameters: []
          };
        }
        
        // Add x-api-key if not already present in headerAuth
        const authHeader = node.parameters.headerAuth || node.parameters?.authentication === 'genericCredentialType' ? node.parameters.headerAuth : null;
        const hasApiKey = (authHeader?.name === 'x-api-key' || node.parameters?.headerAuth?.name === 'x-api-key');
        const hasApiKeyInSendHeaders = node.parameters.options.sendHeaders.headerParameters?.some(h => h.name === 'x-api-key');
        
        if (!hasApiKey && !hasApiKeyInSendHeaders) {
          node.parameters.options.sendHeaders.headerParameters.push({
            name: 'x-api-key',
            value: '={{ $env.WEBHOOK_API_KEY }}'
          });
        }
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  console.log(`Added x-api-key headers to ${file}`);
}

console.log('\nDone adding x-api-key headers to all HTTP nodes.');
