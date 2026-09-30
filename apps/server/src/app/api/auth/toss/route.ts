import { tossLoginRequestSchema } from '@yes-or-no/shared';
import { createLoginSession } from '@/server/auth-sessions';
import { isAllowedAuthOrigin } from '@/server/auth-origin';
import { exchangeTossCode } from '@/server/toss';

export async function POST(request: Request) {
  if (!isAllowedAuthOrigin(request.headers.get('origin'), process.env.WEB_ORIGIN ?? 'http://localhost:3001')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = tossLoginRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid login request' }, { status: 400 });

  try {
    const userKey = await exchangeTossCode(parsed.data);
    await createLoginSession(userKey);
    return Response.json({ authenticated: true });
  } catch {
    return Response.json({ error: 'Toss login failed' }, { status: 502 });
  }
}