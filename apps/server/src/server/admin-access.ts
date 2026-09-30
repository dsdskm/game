import { createHash, timingSafeEqual } from 'node:crypto';

export function hasAdminAccess(header: string | null, configuredToken = process.env.ADMIN_INTERNAL_TOKEN): boolean {
  if (!header || !configuredToken || configuredToken.length < 32) return false;
  const received = createHash('sha256').update(header).digest();
  const expected = createHash('sha256').update(configuredToken).digest();
  return timingSafeEqual(received, expected);
}