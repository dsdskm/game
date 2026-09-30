import { cookies } from 'next/headers';
import { z } from 'zod';
import { adminCookie, isAdmin, validOrigin } from '@/server/admin-auth';
import { createAdminSession, isValidPassword } from '@/server/admin-session';

export async function POST(request: Request) {
  if (!validOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length < 32) {
    return Response.json({ error: 'Admin credentials are not configured' }, { status: 503 });
  }
  const parsed = z.object({ password: z.string().max(256) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidPassword(parsed.data.password)) return Response.json({ error: 'Invalid password' }, { status: 401 });
  (await cookies()).set(adminCookie, createAdminSession(process.env.ADMIN_SESSION_SECRET), {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 60 * 60,
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!validOrigin(request) || !await isAdmin()) return Response.json({ error: 'Forbidden' }, { status: 403 });
  (await cookies()).delete(adminCookie);
  return Response.json({ ok: true });
}