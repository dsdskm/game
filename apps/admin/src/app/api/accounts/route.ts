import { forwardAdminRequest } from '@/server/proxy';

export const GET = (request: Request) => forwardAdminRequest(request, 'accounts');