import { setPendingFilter } from './pendingSearch';
import { api } from './api';
import { startExplainFlow } from './explainMode';

export interface CopilotAction {
  tool: string;
  args: any;
  status: 'success' | 'error' | 'pending';
  result?: string;
  requiresConfirmation?: boolean;
  pendingActionId?: string;
}

export function runUIAction(action: CopilotAction) {
  if (action.status !== 'success') return;
  if (action.tool === 'explain_flow') {
    startExplainFlow(action.args?.steps || []);
    return;
  }
  if (action.tool !== 'navigate_ui') return;
  const { page, filters, highlightId } = action.args || {};
  if (!page) return;
  setPendingFilter(page, { filters, highlightId });
  window.location.hash = '/' + page;
}

export function runUIActions(actions: CopilotAction[] | undefined) {
  (actions || []).forEach(runUIAction);
}

function highlightTargetForConfirmedAction(tool: string, args: any): { page: string; highlightId: string } | null {
  if (['update_lead_status', 'send_message', 'initiate_call', 'send_email'].includes(tool) && args?.leadId) {
    return { page: 'leads', highlightId: args.leadId };
  }
  if (tool === 'update_ticket' && args?.ticketId) {
    return { page: 'tickets', highlightId: args.ticketId };
  }
  return null;
}

export async function confirmPendingAction(pendingActionId: string): Promise<{ status: string; result: any; tool: string; args: any }> {
  const res = await api('/copilot/confirm-action', {
    method: 'POST',
    body: JSON.stringify({ pendingActionId }),
  });
  const target = highlightTargetForConfirmedAction(res.tool, res.args);
  if (target) {
    runUIAction({ tool: 'navigate_ui', args: target, status: 'success' });
  }
  return res;
}
