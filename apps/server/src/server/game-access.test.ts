import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessGame } from './game-access';

test('logged-in games require their owner while guest games remain available', () => {
  assert.equal(canAccessGame('user-1', 'user-1'), true);
  assert.equal(canAccessGame('user-1', 'user-2'), false);
  assert.equal(canAccessGame('user-1', null), false);
  assert.equal(canAccessGame(null, null), true);
});