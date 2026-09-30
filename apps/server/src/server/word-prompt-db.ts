import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { validateWordPrompt } from './word-prompt';

export const defaultTopicPrompt = '스무고개 게임에서 사용할 친숙하고 구체적인 주제 하나를 무작위로 골라라. 동물, 음식, 스포츠, 악기, 탈것, 직업 등 다양한 주제 중에서 선택한다. 답은 한국어 주제 이름 하나만 출력한다. 설명, 따옴표, 문장부호, 줄바꿈은 넣지 마라.';

export function validateTopicPrompt(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) {
    throw new Error('Topic prompt must be 1-4000 characters long');
  }
  return value.trim();
}

function openDatabase(): DatabaseSync {
  const path = resolve(process.env.AI_WORD_PROMPT_DB_PATH ?? 'data/word-prompts.sqlite');
  mkdirSync(dirname(path), { recursive: true });
  const database = new DatabaseSync(path);
  database.exec('CREATE TABLE IF NOT EXISTS ai_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return database;
}

export function getSavedWordPrompt(): string | null {
  const database = openDatabase();
  try {
    const row = database.prepare('SELECT value FROM ai_settings WHERE key = ?').get('word_prompt');
    return row ? validateWordPrompt(row.value) : null;
  } finally {
    database.close();
  }
}

export function saveSavedWordPrompt(value: unknown): string {
  const prompt = validateWordPrompt(value);
  const database = openDatabase();
  try {
    database.prepare('INSERT INTO ai_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('word_prompt', prompt);
    return prompt;
  } finally {
    database.close();
  }
}

export function getSavedTopicPrompt(): string | null {
  const database = openDatabase();
  try {
    const row = database.prepare('SELECT value FROM ai_settings WHERE key = ?').get('topic_prompt');
    return row ? validateTopicPrompt(row.value) : null;
  } finally {
    database.close();
  }
}

export function saveSavedTopicPrompt(value: unknown): string {
  const prompt = validateTopicPrompt(value);
  const database = openDatabase();
  try {
    database.prepare('INSERT INTO ai_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('topic_prompt', prompt);
    return prompt;
  } finally {
    database.close();
  }
}