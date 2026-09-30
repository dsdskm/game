import { createHmac, timingSafeEqual } from 'node:crypto';

const duration = 12 * 60 * 60 * 1000;

export function isValidPassword(input: string, configured = process.env.ADMIN_PASSWORD): boolean {
  if (!configured || configured.length < 4) return false;
  const received = Buffer.from(input);
  const expected = Buffer.from(configured);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createAdminSession(secret: string, now = Date.now()): string {
  const expires = String(now + duration);
  const signature = createHmac('sha256', secret).update(expires).digest('hex');
  return `${expires}.${signature}`;
}

export function verifyAdminSession(value: string | undefined, secret = process.env.ADMIN_SESSION_SECRET, now = Date.now()): boolean {
  if (!value || !secret || secret.length < 32) return false;
  const [expires, signature, extra] = value.split('.');
  if (extra || !/^\d{13}$/.test(expires ?? '') || !/^[a-f0-9]{64}$/.test(signature ?? '') || Number(expires) <= now) return false;
  const expected = createHmac('sha256', secret).update(expires).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}