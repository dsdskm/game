import { z } from 'zod';

const tokenResponse = z.object({
  resultType: z.literal('SUCCESS'),
  success: z.object({ accessToken: z.string().min(1) }),
});

const userResponse = z.object({
  resultType: z.literal('SUCCESS'),
  success: z.object({ userKey: z.number().int().safe().positive() }),
});

export function readAccessToken(response: unknown): string {
  return tokenResponse.parse(response).success.accessToken;
}

export function readUserKey(response: unknown): string {
  return String(userResponse.parse(response).success.userKey);
}