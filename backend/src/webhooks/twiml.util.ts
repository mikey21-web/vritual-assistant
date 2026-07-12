function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Speaks `sayText`, then listens for the caller's reply and POSTs it to
// `gatherActionUrl`. Falls through to a goodbye + hangup if nothing is heard.
export function buildGatherTwiml(sayText: string, gatherActionUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(gatherActionUrl)}" method="POST" speechTimeout="auto">
    <Say>${escapeXml(sayText)}</Say>
  </Gather>
  <Say>Sorry, I didn't catch that. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

// Speaks `sayText` and ends the call — used when the agent has finished the
// conversation (escalated, marked lost, or the turn cap was hit).
export function buildHangupTwiml(sayText: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(sayText)}</Say>
  <Hangup/>
</Response>`;
}
