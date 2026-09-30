import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGeneratedTopic } from './generated-topic';

test('random topics accept Korean category names, not explanations or long responses', () => {
  assert.equal(validateGeneratedTopic(' 악기 '), '악기');
  assert.equal(validateGeneratedTopic('운동 기구'), '운동 기구');
  assert.throws(() => validateGeneratedTopic('악기입니다.'));
  assert.throws(() => validateGeneratedTopic('가'.repeat(21)));
  assert.throws(() => validateGeneratedTopic(''));
});