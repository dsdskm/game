import assert from 'node:assert/strict';
import test from 'node:test';
import { askQuestion, beginDefense, defend, makeGuess, newGame, normalizeAnswer } from './index';

const id = '00000000-0000-4000-8000-000000000001';

test('questions count toward the limit and end the game', () => {
  const start = newGame(id, 'animals', 2);
  const first = askQuestion(start, 'Does it swim?', 'yes');
  assert.equal(start.questionCount, 0);
  assert.equal(first.questionCount, 1);
  assert.equal(first.history.length, 2);
  const last = askQuestion(first, 'Is it big?', 'no');
  assert.equal(last.status, 'lost');
  assert.throws(() => askQuestion(last, 'Another?', 'no'));
  assert.throws(() => makeGuess(last, 'cat', ['cat']));
});

test('guesses match normalized aliases exactly', () => {
  const start = newGame(id, 'animals');
  assert.equal(normalizeAnswer('  ＣＡＴ   '), 'cat');
  assert.equal(makeGuess(start, '  ＣＡＴ   ', ['cat', 'kitty']).status, 'won');
  assert.equal(makeGuess(start, 'cats', ['cat']).status, 'lost');
});

test('invalid limits are rejected', () => {
  assert.throws(() => newGame(id, 'food', 0));
});

test('both modes switch to defense and AI guesses end only on a match or question limit', () => {
  const attack = makeGuess(newGame(id, 'animals', 2, 'both'), 'wrong', ['cat']);
  const defense = beginDefense(attack, '털이 있나요?');
  assert.equal(defense.attackResult, 'lost');
  assert.equal(defense.phase, 'defense');
  assert.throws(() => makeGuess(defense, 'cat', ['cat']));
  const turn = defend(defense, 'yes', 'dog', ['cat'], '네 발로 걷나요?');
  assert.equal(turn.status, 'playing');
  assert.equal(defend(turn, 'yes', 'cat', ['cat'], '').status, 'lost');
  assert.equal(defend(turn, 'no', 'dog', ['cat'], '').status, 'won');
});