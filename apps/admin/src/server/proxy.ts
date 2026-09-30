import { isAdmin, validOrigin } from './admin-auth';

export async function forwardAdminRequest(request: Request, endpoint: 'ai' | 'accounts'): Promise<Response> {
  if (!await isAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (request.method !== 'GET' && !validOrigin(request)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  const token = process.env.ADMIN_INTERNAL_TOKEN;
  if (!token || token.length < 32) return Response.json({ error: 'Internal authorization is not configured' }, { status: 503 });
  try {
    const response = await fetch(`${process.env.SERVER_INTERNAL_URL ?? 'http://localhost:3000'}/api/admin/${endpoint}`, {
      method: request.method,
      headers: { 'x-admin-internal-token': token, 'Content-Type': 'application/json' },
      body: request.method === 'GET' ? undefined : await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Server unavailable' }, { status: 502 });
  }
}