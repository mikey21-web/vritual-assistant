import { api } from './api';
import type { Lead, Contact, Campaign, Task, Message, Template, Integration, BookingSetting, CrmMapping, ScoringRule, RoutingRule, AutomationRule, PipelineStage, FailureRecord, User, HealthReport, AnalyticsOverview } from './types';

export async function fetchAnalytics() { return api('/analytics/overview') as Promise<AnalyticsOverview>; }
export async function fetchSources() { return api('/analytics/sources') as Promise<{ source: string; count: number }[]>; }
export async function fetchAgents() { return api('/analytics/agents') as Promise<{ id: string; name: string; role: string; assignedLeads: number; converted: number }[]>; }
// /health/ready is public and returns { status, checks: { database, uptime, memory } };
// plain /health is the lightweight liveness probe with no `checks` (Overview needs checks.database).
export async function fetchHealth() { return api('/health/ready') as Promise<any>; }
export async function fetchDeepHealth() { return api('/health/deep') as Promise<HealthReport>; }

export async function fetchLeads(page = 1, filters: Record<string, string> = {}) {
  const q = new URLSearchParams({ page: String(page), limit: '20', ...filters });
  return api(`/leads?${q}`) as Promise<{ data: Lead[]; meta: { total: number; page: number; limit: number } }>;
}
export async function fetchLead(id: string) { return api(`/leads/${id}`) as Promise<Lead>; }
export async function createLead(data: any) { return api('/leads', { method: 'POST', body: JSON.stringify(data) }) as Promise<Lead>; }
export async function updateLead(id: string, data: any) { return api(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }) as Promise<Lead>; }
export async function scoreLead(id: string) { return api(`/leads/${id}/score`, { method: 'POST' }); }
export async function assignLead(id: string, agentId: string) { return api(`/leads/${id}/assign`, { method: 'POST', body: JSON.stringify({ agentId }) }); }
export async function markSpam(id: string) { return api(`/leads/${id}/mark-spam`, { method: 'POST' }); }
export async function getLeadTimeline(id: string) { return api(`/leads/${id}/timeline`) as Promise<any[]>; }

export async function fetchContacts(page = 1, search = '') { return api(`/contacts?page=${page}&limit=20&search=${search}`) as Promise<{ data: Contact[]; meta: any }>; }
export async function fetchCampaigns() { return api('/campaigns') as Promise<{ data: Campaign[]; meta: any }>; }
export async function createCampaign(data: any) { return api('/campaigns', { method: 'POST', body: JSON.stringify(data) }); }
export async function toggleCampaign(id: string, active: boolean) { return api(`/campaigns/${id}/${active ? 'pause' : 'activate'}`, { method: 'POST' }); }
export async function duplicateCampaign(id: string) { return api(`/campaigns/${id}/duplicate`, { method: 'POST' }); }

export async function fetchTasks() { return api('/tasks') as Promise<any>; }
export async function createTask(data: any) { return api('/tasks', { method: 'POST', body: JSON.stringify(data) }) as Promise<Task>; }
export async function updateTask(id: string, data: any) { return api(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

export async function fetchMessages() { return api('/conversations?limit=50') as Promise<{ data: Message[]; meta: any }>; }
export async function sendMessage(data: any) { return api('/conversations/messages', { method: 'POST', body: JSON.stringify(data) }); }

export async function fetchTemplates() { return api('/message-templates') as Promise<Template[]>; }
export async function createTemplate(data: any) { return api('/message-templates', { method: 'POST', body: JSON.stringify(data) }); }
export async function previewTemplate(id: string, vars: Record<string, string>) { return api(`/message-templates/${id}/preview`, { method: 'POST', body: JSON.stringify(vars) }); }

export async function fetchForms() { return api('/forms') as Promise<any[]>; }
export async function createForm(data: any) { return api('/forms', { method: 'POST', body: JSON.stringify(data) }); }
export async function addFormField(formId: string, data: any) { return api(`/forms/${formId}/fields`, { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteFormField(formId: string, fieldId: string) { return api(`/forms/${formId}/fields/${fieldId}`, { method: 'DELETE' }); }

export async function fetchQRCodes() { return api('/qr-codes') as Promise<any[]>; }
export async function createQRCode(data: any) { return api('/qr-codes', { method: 'POST', body: JSON.stringify(data) }); }

export async function fetchMedia() { return api('/media') as Promise<{ data: any[]; meta: any }>; }
export async function deleteMedia(id: string) { return api(`/media/${id}`, { method: 'DELETE' }); }

export async function fetchScoringRules() { return api('/scoring-rules') as Promise<any>; }
export async function createScoringRule(data: any) { return api('/scoring-rules', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteScoringRule(id: string) { return api(`/scoring-rules/${id}`, { method: 'DELETE' }); }

export async function fetchRoutingRules() { return api('/routing-rules') as Promise<any>; }
export async function createRoutingRule(data: any) { return api('/routing-rules', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteRoutingRule(id: string) { return api(`/routing-rules/${id}`, { method: 'DELETE' }); }

export async function fetchIntegrations() { return api('/integrations') as Promise<any>; }
export async function createIntegration(data: any) { return api('/integrations', { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteIntegration(id: string) { return api(`/integrations/${id}`, { method: 'DELETE' }); }
export async function testIntegration(id: string) { return api(`/integrations/${id}/test`, { method: 'POST' }); }

export async function fetchCRMMappings() { return api('/crm-mappings') as Promise<any>; }
export async function createCRMMapping(data: any) { return api('/crm-mappings', { method: 'POST', body: JSON.stringify(data) }); }
export async function testCRMMapping(id: string) { return api(`/crm-mappings/${id}/test`, { method: 'POST' }); }

export async function fetchBookingSettings() { return api('/booking-settings') as Promise<any>; }
export async function createBookingSetting(data: any) { return api('/booking-settings', { method: 'POST', body: JSON.stringify(data) }); }

export async function fetchPipelineStages() { return api('/pipeline-stages') as Promise<PipelineStage[]>; }
export async function fetchBlocklist() { return api('/blocklist') as Promise<any[]>; }
export async function fetchSLARules() { return api('/sla-rules') as Promise<any[]>; }
export async function fetchRevenue() { return api('/revenue') as Promise<any>; }

export async function fetchUsers() { return api('/users') as Promise<User[]>; }
export async function fetchAuditLogs() { return api('/audit-logs') as Promise<any>; }

export async function fetchBusinessSettings() { return api('/business-settings') as Promise<any>; }
export async function updateBusinessSettings(data: any) { return api('/business-settings', { method: 'PATCH', body: JSON.stringify(data) }); }

export async function fetchFailures(filter = 'all') { return api(filter === 'open' ? '/failures/open' : '/failures') as Promise<FailureRecord[]>; }
export async function retryFailure(id: string) { return api(`/failures/${id}/retry`, { method: 'POST' }); }
export async function resolveFailure(id: string) { return api(`/failures/${id}/resolve`, { method: 'POST' }); }

export async function fetchAutomationRules() { return api('/rules') as Promise<AutomationRule[]>; }
export async function createAutomationRule(data: any) { return api('/rules', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateAutomationRule(id: string, data: any) { return api(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
export async function deleteAutomationRule(id: string) { return api(`/rules/${id}`, { method: 'DELETE' }); }
export async function testRuleConditions(conditions: any[], testLead: any) { return api('/rules/test', { method: 'POST', body: JSON.stringify({ conditions, testLead }) }); }

export async function fetchConversions() { return api('/conversions') as Promise<any>; }
export async function fetchNurtureSequences() { return api('/nurture-sequences') as Promise<any>; }
export async function createNurtureSequence(data: any) { return api('/nurture-sequences', { method: 'POST', body: JSON.stringify(data) }); }
export async function addNurtureStep(seqId: string, data: any) { return api(`/nurture-sequences/${seqId}/steps`, { method: 'POST', body: JSON.stringify(data) }); }
export async function deleteNurtureStep(seqId: string, stepId: string) { return api(`/nurture-sequences/${seqId}/steps/${stepId}`, { method: 'DELETE' }); }
export async function deleteNurtureSequence(seqId: string) { return api(`/nurture-sequences/${seqId}`, { method: 'DELETE' }); }

export async function triggerAgent(leadId: string) { return api('/agent/run-summary', { method: 'POST', body: JSON.stringify({ leadId, action: 'manual_trigger' }) }); }
