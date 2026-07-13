import { registerAs } from '@nestjs/config';
import { KhojConfig } from './khoj-client.constants';

export default registerAs('khoj', (): KhojConfig => ({
  baseUrl: process.env.KHOJ_BASE_URL || 'http://localhost:42111',
  apiKey: process.env.KHOJ_API_KEY || undefined,
  timeout: parseInt(process.env.KHOJ_TIMEOUT || '30000', 10),
}));
