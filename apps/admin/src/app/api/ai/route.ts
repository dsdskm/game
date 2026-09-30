import { forwardAdminRequest } from '@/server/proxy';

export const GET = (request: Request) => forwardAdminRequest(request, 'ai');
export const PUT = (request: Request) => forwardAdminRequest(request, 'ai');
export const POST = (request: Request) => forwardAdminRequest(request, 'ai');