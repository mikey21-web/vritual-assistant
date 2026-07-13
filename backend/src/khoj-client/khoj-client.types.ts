export interface KhojQueryOpts {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface KhojQueryResponse {
  answer: string;
  sources?: KhojSource[];
  conversationId?: string;
}

export interface KhojSource {
  file: string;
  section: string;
  score: number;
  content: string;
}

export type ContentType = 'pdf' | 'markdown' | 'plaintext' | 'org' | 'csv' | 'json';

export interface KhojMemory {
  id: number;
  raw: string;
  createdAt: string;
}

export interface KhojAgentConfig {
  name: string;
  persona: string;
  instructions: string;
  tools: string[];
  knowledgeSources?: string[];
}

export interface KhojAgent {
  id: string;
  name: string;
  slug: string;
  persona: string;
  createdAt: string;
}

export interface KhojAutomationConfig {
  name: string;
  cronSchedule: string;
  agentSlug: string;
  query: string;
}

export interface KhojAutomation {
  id: string;
  name: string;
  cronSchedule: string;
  enabled: boolean;
  nextRun: string;
}

export interface ResearchResult {
  summary: string;
  findings: ResearchFinding[];
  sources: string[];
  timestamp: string;
}

export interface ResearchFinding {
  title: string;
  content: string;
  url: string;
  relevance: number;
}

export interface KhojError {
  status: number;
  message: string;
  code?: string;
}
