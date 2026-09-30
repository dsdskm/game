import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminSession, isValidPassword, verifyAdminSession } from './admin-session';

test('admin credentials fail closed, sessions expire and cannot be forged', () => {
  const secret = 'a'.repeat(32);
  assert.equal(isValidPassword('123', '123'), false);
  assert.equal(isValidPassword('1234', '1234'), true);
  assert.equal(isValidPassword('1235', '1234'), false);
  assert.equal(isValidPassword('strong-password', 'strong-password'), true);
  const cookie = createAdminSession(secret, 1800000000000);
  assert.equal(verifyAdminSession(cookie, secret, 1800000000001), true);
  assert.equal(verifyAdminSession(cookie, 'b'.repeat(32), 1800000000001), false);
  assert.equal(verifyAdminSession(cookie, secret, 1800000000000 + 12 * 60 * 60 * 1000), false);
});