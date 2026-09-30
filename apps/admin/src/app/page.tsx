import { isAdmin } from '@/server/admin-auth';
import AdminDashboard from './dashboard';
import Login from './login';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!await isAdmin()) return <Login />;
  return <AdminDashboard />;
}