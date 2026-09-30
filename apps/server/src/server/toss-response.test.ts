import assert from 'node:assert/strict';
import test from 'node:test';
import { readAccessToken, readUserKey } from './toss-response';

test('accepts only successful, structurally valid Toss responses', () => {
  assert.equal(readAccessToken({ resultType: 'SUCCESS', success: { accessToken: 'token' } }), 'token');
  assert.equal(readUserKey({ resultType: 'SUCCESS', success: { userKey: 443731104 } }), '443731104');
  assert.throws(() => readAccessToken({ resultType: 'FAIL', success: { accessToken: 'token' } }));
  assert.throws(() => readUserKey({ resultType: 'SUCCESS', success: { userKey: Number.MAX_SAFE_INTEGER + 1 } }));
});