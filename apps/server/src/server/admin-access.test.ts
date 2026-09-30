import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAdminAccess } from './admin-access';

test('internal admin access fails closed without a strong configured token', () => {
  assert.equal(hasAdminAccess('secret', undefined), false);
  assert.equal(hasAdminAccess('secret', 'short'), false);
  assert.equal(hasAdminAccess('x'.repeat(32), 'x'.repeat(32)), true);
  assert.equal(hasAdminAccess('y'.repeat(32), 'x'.repeat(32)), false);
});