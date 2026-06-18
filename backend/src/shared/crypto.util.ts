import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const MIN_ENCRYPTED_LENGTH = 44; // base64(12+16+1)

function getKey(): Buffer {
  const key = process.env.INTEGRATIONS_ENC_KEY;
  if (!key) throw new Error('INTEGRATIONS_ENC_KEY environment variable is required');
  const hash = crypto.createHash('sha256').update(key).digest();
  return hash;
}

export function isEncrypted(value: string): boolean {
  if (!value || value.length < MIN_ENCRYPTED_LENGTH) return false;
  try {
    const buf = Buffer.from(value, 'base64');
    if (buf.length < 29) return false;
    return true;
  } catch {
    return false;
  }
}

export function encrypt(text: string): string {
  if (isEncrypted(text)) return text;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const result = Buffer.concat([iv, tag, encrypted]);
  return result.toString('base64');
}

export function decrypt(data: string): string {
  if (!isEncrypted(data)) return data;
  const key = getKey();
  const buf = Buffer.from(data, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
