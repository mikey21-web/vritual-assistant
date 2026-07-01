import { Logger } from '@nestjs/common';

const REQUIRED_VARS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
] as const;

const PROD_REQUIRED_VARS = [
  'AGENT_INBOUND_KEY',
  'AGENT_SERVICE_JWT',
  'INTEGRATIONS_ENC_KEY',
] as const;

export function validateEnv() {
  const logger = new Logger('EnvValidation');
  const isDev = process.env.NODE_ENV !== 'production';
  const errors: string[] = [];

  for (const v of REQUIRED_VARS) {
    if (!process.env[v]) errors.push(`Missing required env var: ${v}`);
  }

  if (!isDev) {
    for (const v of PROD_REQUIRED_VARS) {
      if (!process.env[v]) errors.push(`Missing required production env var: ${v}`);
    }
  }

  // Validate JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 16) {
    errors.push('JWT_SECRET must be at least 16 characters long');
  }

  const defaultSecrets = ['change-me', 'dev-secret', 'local-dev-jwt-secret-2024', 'local-dev-signed-url-secret'];
  for (const [name, value] of Object.entries({
    JWT_SECRET: process.env.JWT_SECRET,
    SIGNED_URL_SECRET: process.env.SIGNED_URL_SECRET,
    INTEGRATIONS_ENC_KEY: process.env.INTEGRATIONS_ENC_KEY,
  })) {
    if (value && defaultSecrets.includes(value) && !isDev) {
      errors.push(`${name} must be changed from the default value in production`);
    }
  }

  // Validate encryption key length (AES-256 needs exactly 32 bytes)
  const encKey = process.env.INTEGRATIONS_ENC_KEY;
  if (encKey && encKey.length !== 32) {
    if (isDev) {
      logger.warn(`INTEGRATIONS_ENC_KEY is ${encKey.length} chars (expected 32 for AES-256)`);
    } else {
      errors.push(`INTEGRATIONS_ENC_KEY must be exactly 32 characters for AES-256 (currently ${encKey.length})`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  logger.log('Environment variables validated successfully');
}
