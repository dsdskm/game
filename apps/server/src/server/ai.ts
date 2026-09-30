import 'server-only';
import type { Category, Reply } from '@yes-or-no/shared';
import { candidateWords, knownAttributes, type Answer } from '@yes-or-no/question-bank';
import { isBankCategory } from './setup';
import { defaultGamePrompts, getGamePrompts, renderGamePrompt, validateGamePrompts } from './word-prompt';
import { defaultTopicPrompt, getSavedTopicPrompt, getSavedWordPrompt } from './word-prompt-db';
import { validateGeneratedTopic } from './generated-topic';

async function askModel(instruction: string, question?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('AI key is not configured');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, messages: question === undefined
      ? [{ role: 'user', content: instruction }]
      : [{ role: 'system', content: instruction }, { role: 'user', content: question }] }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('AI service unavailable');
  const data: unknown = await response.json();
  return (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim() ?? '';
}

export async function generateWord(category: string): Promise<string> {
  return testWordPrompt(getSavedWordPrompt() ?? (await getGamePrompts()).word, category);
}

export async function generateRandomTopic(): Promise<string> {
  return validateGeneratedTopic(await askModel(getSavedTopicPrompt() ?? defaultTopicPrompt));
}

export async function testWordPrompt(prompt: string, category: string): Promise<string> {
  const word = await askModel(renderGamePrompt(validateGamePrompts({ ...defaultGamePrompts, word: prompt }).word, { category }));
  if (!/^[\p{L}\p{N}]{1,5}$/u.test(word)) throw new Error('AI returned an invalid word');
  return word;
}

export async function isValidWord(word: string, category: string): Promise<boolean> {
  const result = await askModel(renderGamePrompt((await getGamePrompts()).validation, { word, category: category === 'random' ? 'any category' : category }));
  return result.toUpperCase() === 'YES';
}

export async function nextDefenseGuess(category: string, history: { kind: string; text: string }[], turn: number): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    if (!isBankCategory(category)) throw new Error('Mock AI needs a known category');
    const candidates = candidateWords(category);
    return candidates[turn % candidates.length];
  }
  const guess = await askModel(renderGamePrompt((await getGamePrompts()).defenseGuess, { category, history }));
  if (!/^[\p{L}\p{N}]{1,5}$/u.test(guess)) throw new Error('Invalid AI guess');
  return guess;
}

const defenseQuestions = ['살아 있는 것인가요?', '집에서 볼 수 있나요?', '먹을 수 있나요?', '크기가 손바닥보다 큰가요?', '자연에서 찾을 수 있나요?'];

export function defenseQuestion(turn: number): string {
  return defenseQuestions[turn % defenseQuestions.length];
}

export async function answerQuestion(answer: Answer, category: Category, question: string): Promise<Reply> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const words = question.toLowerCase();
    if (!isBankCategory(category)) return 'unknown';
    const matching = knownAttributes(category).filter((attribute) => words.includes(attribute.toLowerCase()));
    if (!matching.length) return 'unknown';
    return matching.some((attribute) => answer.attributes.includes(attribute)) ? 'yes' : 'no';
  }

  const reply = (await askModel(renderGamePrompt((await getGamePrompts()).answer, {
    answer: answer.name, attributes: answer.attributes, category,
  }), question)).toLowerCase();
  return reply === 'yes' || reply === 'no' ? reply : 'unknown';
}