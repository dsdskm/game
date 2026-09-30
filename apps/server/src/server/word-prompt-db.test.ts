import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getSavedTopicPrompt, getSavedWordPrompt, saveSavedTopicPrompt, saveSavedWordPrompt } from './word-prompt-db';

test('word prompt starts unset, persists in SQLite, and rejects invalid edits', () => {
  const directory = mkdtempSync(join(tmpdir(), 'yes-or-no-sqlite-'));
  const previous = process.env.AI_WORD_PROMPT_DB_PATH;
  process.env.AI_WORD_PROMPT_DB_PATH = join(directory, 'nested', 'settings.sqlite');
  try {
    assert.equal(getSavedWordPrompt(), null);
    assert.equal(saveSavedWordPrompt('단어를 고르세요: {{category}}'), '단어를 고르세요: {{category}}');
    assert.equal(getSavedWordPrompt(), '단어를 고르세요: {{category}}');
    assert.equal(getSavedTopicPrompt(), null);
    assert.equal(saveSavedTopicPrompt('랜덤 주제를 골라라'), '랜덤 주제를 골라라');
    assert.equal(getSavedTopicPrompt(), '랜덤 주제를 골라라');
    assert.throws(() => saveSavedTopicPrompt(' '));
    assert.equal(getSavedWordPrompt(), '단어를 고르세요: {{category}}');
    assert.throws(() => saveSavedWordPrompt('변수 없음'));
    assert.equal(getSavedWordPrompt(), '단어를 고르세요: {{category}}');
  } finally {
    if (previous === undefined) delete process.env.AI_WORD_PROMPT_DB_PATH;
    else process.env.AI_WORD_PROMPT_DB_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});