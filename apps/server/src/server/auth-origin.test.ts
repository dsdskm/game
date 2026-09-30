import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedAuthOrigin } from './auth-origin';

test('authentication mutations accept only the configured web origin', () => {
  assert.equal(isAllowedAuthOrigin('http://localhost:3001', 'http://localhost:3001'), true);
  assert.equal(isAllowedAuthOrigin('https://elsewhere.example', 'http://localhost:3001'), false);
  assert.equal(isAllowedAuthOrigin(null, 'http://localhost:3001'), false);
});