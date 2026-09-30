import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const defaultWordPrompt = 'Choose one real, common Korean noun in the category {{category}}. Return ONLY the noun, no punctuation, no whitespace, at most 5 characters.';

export const defaultGamePrompts = {
  word: defaultWordPrompt,
  validation: 'Is {{word}} a real, concrete, commonly recognizable noun in the category {{category}}? Answer ONLY YES or NO. Reject invented words, brands, profanity and unrelated words.',
  defenseGuess: 'You are playing 20 Questions. Guess the user\'s real word (at most five characters) in category {{category}} based ONLY on this public conversation: {{history}}. Return ONLY a single noun, no punctuation or explanation. Do not repeat previous guesses.',
  answer: 'Answer only yes, no, or unknown. The secret is {{answer}}. Its properties are {{attributes}}. Never reveal the secret.',
};

export type GamePrompts = typeof defaultGamePrompts;
const required: Record<keyof GamePrompts, readonly string[]> = {
  word: ['category'],
  validation: ['word', 'category'],
  defenseGuess: ['category', 'history'],
  answer: ['answer', 'attributes'],
};

function promptPath(): string {
  return resolve(process.env.AI_WORD_PROMPT_PATH ?? 'data/word-prompt.json');
}

export function validateWordPrompt(value: unknown): string {
  if (typeof value !== 'string' || value.length > 4000 || !value.trim() || !value.includes('{{category}}')) {
    throw new Error('Prompt must contain {{category}} and be 1-4000 characters long');
  }
  return value.trim();
}

export function validateGamePrompts(value: unknown): GamePrompts {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid game prompts');
  const entries = value as Record<string, unknown>;
  const result = {} as GamePrompts;
  for (const field of Object.keys(required) as (keyof GamePrompts)[]) {
    const template = entries[field];
    if (typeof template !== 'string' || !template.trim() || template.length > 4000 ||
        required[field].some((placeholder) => !template.includes(`{{${placeholder}}}`)) ||
        Array.from(template.matchAll(/{{([^{}]+)}}/g)).some((match) => !required[field].includes(match[1]) && !(field === 'answer' && match[1] === 'category'))) {
      throw new Error(`Invalid ${field} prompt`);
    }
    result[field] = template.trim();
  }
  return result;
}

export async function getGamePrompts(): Promise<GamePrompts> {
  try {
    const saved: unknown = JSON.parse(await readFile(promptPath(), 'utf8'));
    if (typeof saved === 'object' && saved !== null && 'prompt' in saved) {
      return { ...defaultGamePrompts, word: validateWordPrompt(saved.prompt) };
    }
    return validateGamePrompts(saved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ...defaultGamePrompts };
    throw error;
  }
}

export async function saveGamePrompts(value: unknown): Promise<GamePrompts> {
  const prompts = validateGamePrompts(value);
  await writePromptFile(prompts);
  return prompts;
}

export function renderGamePrompt(template: string, values: Record<string, unknown>): string {
  return template.replace(/{{([^{}]+)}}/g, (_, key: string) => JSON.stringify(values[key]));
}

export async function getWordPrompt(): Promise<string> {
  return (await getGamePrompts()).word;
}

export async function saveWordPrompt(value: unknown): Promise<string> {
  const prompt = validateWordPrompt(value);
  await saveGamePrompts({ ...await getGamePrompts(), word: prompt });
  return prompt;
}

async function writePromptFile(value: object): Promise<void> {
  const path = promptPath();
  const temporary = `${path}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, JSON.stringify(value), { flag: 'wx', mode: 0o600 });
  try {
    await rename(temporary, path);
  } catch (error) {
    await unlink(temporary);
    throw error;
  }
}

export function renderWordPrompt(prompt: string, category: string): string {
  return renderGamePrompt(prompt, { category });
}