export const KHOJ_CONFIG_KEY = 'khoj';

export interface KhojConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
}

export const DEFAULT_KHOJ_CONFIG: KhojConfig = {
  baseUrl: 'http://localhost:42111',
  apiKey: undefined,
  timeout: 30000,
};

export const KHOJ_API_PATHS = {
  chat: '/api/chat',
  search: '/api/search',
  content: '/api/content',
  agents: '/api/agents',
  automation: '/api/automation',
  memories: '/api/memories',
  health: '/api/health',
  settings: '/api/settings',
} as const;

export const KHOJ_SERVICE_NAME = 'KHOJ_CLIENT';
