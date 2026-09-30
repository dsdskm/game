import { hasAdminAccess } from '@/server/admin-access';
import { activeAccounts } from '@/server/auth-sessions';

export async function GET(request: Request) {
  if (!hasAdminAccess(request.headers.get('x-admin-internal-token'))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ accounts: activeAccounts() }, { headers: { 'Cache-Control': 'no-store' } });
}