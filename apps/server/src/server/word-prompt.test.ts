import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { defaultGamePrompts, defaultWordPrompt, getGamePrompts, getWordPrompt, renderGamePrompt, renderWordPrompt, saveGamePrompts, saveWordPrompt, validateGamePrompts, validateWordPrompt } from './word-prompt';

test('word prompt persists and renders category without losing the default', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'yes-or-no-prompt-'));
  const previous = process.env.AI_WORD_PROMPT_PATH;
  const path = join(directory, 'prompt.json');
  process.env.AI_WORD_PROMPT_PATH = path;
  try {
    assert.equal(await getWordPrompt(), defaultWordPrompt);
    await writeFile(path, JSON.stringify({ prompt: 'Pick for {{category}}' }));
    assert.equal((await getGamePrompts()).word, 'Pick for {{category}}');
    assert.equal(await getWordPrompt(), 'Pick for {{category}}');
    assert.equal(renderWordPrompt(await getWordPrompt(), '동물'), 'Pick for "동물"');
    assert.throws(() => validateWordPrompt('no category'));
    const prompts = { ...defaultGamePrompts, word: 'Choose {{category}}' };
    assert.deepEqual(await saveGamePrompts(prompts), prompts);
    assert.deepEqual(await getGamePrompts(), prompts);
    assert.equal(await getWordPrompt(), prompts.word);
    assert.equal(await saveWordPrompt('New {{category}}'), 'New {{category}}');
    assert.equal((await getGamePrompts()).validation, prompts.validation);
    assert.equal(renderGamePrompt('Choose {{category}}', { category: '동물' }), 'Choose "동물"');
    for (const [field, template] of Object.entries(defaultGamePrompts)) {
      const rendered = renderGamePrompt(template, {
        category: '동물', word: '고양이', history: [{ kind: 'question', text: '"야옹"?' }],
        answer: '고양이', attributes: ['털', '야옹'],
      });
      assert.equal(rendered.includes('{{'), false, `${field} has an unrendered variable`);
      assert.equal(rendered.includes('undefined'), false, `${field} has a missing value`);
    }
    assert.throws(() => validateGamePrompts({ ...prompts, defenseGuess: 'No history' }));
    assert.throws(() => validateGamePrompts({ ...prompts, word: '{{history}} {{category}}' }));
  } finally {
    if (previous === undefined) delete process.env.AI_WORD_PROMPT_PATH;
    else process.env.AI_WORD_PROMPT_PATH = previous;
    await rm(directory, { recursive: true, force: true });
  }
});