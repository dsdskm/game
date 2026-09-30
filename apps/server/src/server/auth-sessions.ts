import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

const cookieName = 'yes_or_no_session';
const lifetimeSeconds = 60 * 60 * 24;
type LoginSession = { userKey: string; expiresAt: number };
const store = globalThis as typeof globalThis & { __yesOrNoLogins?: Map<string, LoginSession> };
const sessions = store.__yesOrNoLogins ?? (store.__yesOrNoLogins = new Map());

export async function createLoginSession(userKey: string): Promise<void> {
  const oldToken = (await cookies()).get(cookieName)?.value;
  if (oldToken) sessions.delete(oldToken);
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userKey, expiresAt: Date.now() + lifetimeSeconds * 1000 });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: lifetimeSeconds,
  });
}

export async function getLoginSession(): Promise<LoginSession | null> {
  const token = (await cookies()).get(cookieName)?.value;
  const session = token ? sessions.get(token) : undefined;
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token!);
    return null;
  }
  return session;
}

export async function clearLoginSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) sessions.delete(token);
  jar.delete(cookieName);
}

export function activeAccounts(): { userKey: string; sessions: number }[] {
  const counts = new Map<string, number>();
  for (const session of sessions.values()) {
    if (session.expiresAt > Date.now()) counts.set(session.userKey, (counts.get(session.userKey) ?? 0) + 1);
  }
  return Array.from(counts, ([userKey, sessionCount]) => ({ userKey, sessions: sessionCount }));
}