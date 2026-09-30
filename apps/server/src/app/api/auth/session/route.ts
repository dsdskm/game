import { clearLoginSession, getLoginSession } from '@/server/auth-sessions';
import { isAllowedAuthOrigin } from '@/server/auth-origin';

export async function GET() {
  return Response.json({ authenticated: (await getLoginSession()) !== null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (!isAllowedAuthOrigin(request.headers.get('origin'), process.env.WEB_ORIGIN ?? 'http://localhost:3001')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  await clearLoginSession();
  return Response.json({ authenticated: false });
}