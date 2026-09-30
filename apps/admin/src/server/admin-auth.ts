import { cookies } from 'next/headers';
import { verifyAdminSession } from './admin-session';

export const adminCookie = 'yes_or_no_admin';

export async function isAdmin(): Promise<boolean> {
  return verifyAdminSession((await cookies()).get(adminCookie)?.value);
}

export function validOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin;
}