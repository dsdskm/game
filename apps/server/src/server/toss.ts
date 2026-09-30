import 'server-only';
import { readFile } from 'node:fs/promises';
import { Agent, fetch } from 'undici';
import type { TossLoginRequest } from '@yes-or-no/shared';
import { readAccessToken, readUserKey } from './toss-response';

const baseUrl = 'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2';

export async function exchangeTossCode({ authorizationCode, referrer }: TossLoginRequest): Promise<string> {
  const certPath = process.env.TOSS_MTLS_CERT_PATH;
  const keyPath = process.env.TOSS_MTLS_KEY_PATH;
  if (!certPath || !keyPath) throw new Error('Toss mTLS certificate paths are not configured');

  const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);
  const dispatcher = new Agent({ connect: { cert, key }, headersTimeout: 10000, bodyTimeout: 10000 });
  try {
    const tokenResponse = await fetch(`${baseUrl}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorizationCode, referrer }),
      dispatcher,
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error('Toss token exchange failed');
    const accessToken = readAccessToken(await tokenResponse.json());
    const userResponse = await fetch(`${baseUrl}/login-me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      dispatcher,
      signal: AbortSignal.timeout(10000),
    });
    if (!userResponse.ok) throw new Error('Toss user lookup failed');
    return readUserKey(await userResponse.json());
  } finally {
    await dispatcher.close();
  }
}