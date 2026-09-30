import type { StartRequest } from '@yes-or-no/shared';
import { findAnswer, pickAnswer, type Answer, type BankCategory } from '@yes-or-no/question-bank';

export function isBankCategory(category: string): category is BankCategory {
  return category === 'animals' || category === 'food';
}

export function validateSetup(settings: StartRequest, authenticated: boolean): string | null {
  if (!authenticated && settings.category !== 'random') return '직접 카테고리 입력은 로그인이 필요합니다.';
  if (!authenticated && settings.maxQuestions !== 20) return '문제 수 변경은 로그인이 필요합니다.';
  if (settings.mode !== 'attack' && !settings.word) return '수비할 단어를 입력해 주세요.';
  if (settings.mode === 'attack' && settings.word) return '공격 모드에서는 단어를 입력하지 않습니다.';
  if (settings.word) {
    const word = settings.word.normalize('NFKC').trim();
    if (Array.from(word).length > 5 || !/^[\p{L}\p{N}]+$/u.test(word)) return '단어는 공백 없이 5자 이하로 입력해 주세요.';
  }
  return null;
}

export function pickCategory(): BankCategory {
  return Math.random() < 0.5 ? 'animals' : 'food';
}

export function resolveWordTopic(topic: { kind: 'random' } | { kind: 'custom'; category: string }): string {
  return topic.kind === 'random' ? pickCategory() : topic.category;
}

export function mockValidateWord(category: string, word: string): Answer | undefined {
  return isBankCategory(category) ? findAnswer(category, word) : undefined;
}

export function mockPickWord(category: BankCategory): Answer {
  return pickAnswer(category);
}