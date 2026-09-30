import { publicStatistics } from '@/server/sessions';

export async function GET() {
  return Response.json(publicStatistics(), { headers: { 'Cache-Control': 'no-store' } });
}