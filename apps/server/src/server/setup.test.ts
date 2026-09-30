import assert from 'node:assert/strict';
import test from 'node:test';
import { mockValidateWord, resolveWordTopic, validateSetup } from './setup';

test('guest choices are limited to random category and twenty questions', () => {
  const base = { category: 'random', maxQuestions: 20, mode: 'attack' as const };
  assert.equal(validateSetup(base, false), null);
  assert.match(validateSetup({ ...base, category: 'food' }, false) ?? '', /로그인/);
  assert.match(validateSetup({ ...base, maxQuestions: 12 }, false) ?? '', /로그인/);
  assert.equal(validateSetup({ ...base, category: 'food', maxQuestions: 12 }, true), null);
});

test('defense requires a short validated word and attack rejects it', () => {
  const base = { category: 'random', maxQuestions: 20, mode: 'defense' as const };
  assert.match(validateSetup(base, false) ?? '', /단어/);
  assert.match(validateSetup({ ...base, word: 'abcdef' }, false) ?? '', /5자/);
  assert.equal(validateSetup({ ...base, word: '고양이' }, false), null);
  assert.equal(mockValidateWord('animals', '고양이')?.name, 'cat');
  assert.equal(mockValidateWord('food', '고양이'), undefined);
  assert.match(validateSetup({ ...base, mode: 'attack', word: '고양이' }, false) ?? '', /공격/);
});

test('admin word generation chooses a supported random topic or keeps the entered topic', () => {
  assert.ok(['animals', 'food'].includes(resolveWordTopic({ kind: 'random' })));
  assert.equal(resolveWordTopic({ kind: 'custom', category: '우주' }), '우주');
});