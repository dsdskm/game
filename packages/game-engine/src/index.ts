import type { Category, GameMode, PublicGame, Reply } from '@yes-or-no/shared';

export function newGame(id: string, category: Category, maxQuestions = 20, mode: GameMode = 'attack'): PublicGame {
  if (!Number.isInteger(maxQuestions) || maxQuestions < 1) {
    throw new RangeError('maxQuestions must be a positive integer');
  }
  return { id, category, mode, phase: mode === 'defense' ? 'defense' : 'attack', status: 'playing', questionCount: 0, maxQuestions, history: [] };
}

export function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/gu, ' ');
}

function ensurePlaying(game: PublicGame): void {
  if (game.status !== 'playing') throw new Error('Game has ended');
}

export function askQuestion(game: PublicGame, question: string, reply: Reply): PublicGame {
  ensurePlaying(game);
  if (game.phase !== 'attack') throw new Error('Not an attack round');
  if (game.questionCount >= game.maxQuestions) throw new Error('Question limit reached');
  return {
    ...game,
    questionCount: game.questionCount + 1,
    status: game.questionCount + 1 === game.maxQuestions ? 'lost' : 'playing',
    history: [
      ...game.history,
      { role: 'player', kind: 'question', text: question },
      { role: 'assistant', kind: 'answer', text: reply },
    ],
  };
}

export function makeGuess(game: PublicGame, guess: string, answers: readonly string[]): PublicGame {
  ensurePlaying(game);
  if (game.phase !== 'attack') throw new Error('Not an attack round');
  const normalizedGuess = normalizeAnswer(guess);
  const correct = answers.some((answer) => normalizeAnswer(answer) === normalizedGuess);
  return {
    ...game,
    status: correct ? 'won' : 'lost',
    history: [...game.history, { role: 'player', kind: 'guess', text: guess }],
  };
}

export function beginDefense(game: PublicGame, firstQuestion: string): PublicGame {
  if (game.mode === 'both' && (game.phase !== 'attack' || game.status === 'playing')) {
    throw new Error('Finish the attack first');
  }
  if (game.mode === 'attack') throw new Error('No defense round');
  return {
    ...game,
    phase: 'defense',
    attackResult: game.mode === 'both' ? game.status as 'won' | 'lost' : undefined,
    status: 'playing',
    questionCount: 0,
    history: [{ role: 'assistant', kind: 'question', text: firstQuestion }],
  };
}

export function defend(game: PublicGame, reply: Reply, guess: string, answers: readonly string[], nextQuestion: string): PublicGame {
  ensurePlaying(game);
  if (game.phase !== 'defense' || game.history.at(-1)?.kind !== 'question') throw new Error('No pending AI question');
  const count = game.questionCount + 1;
  const correct = answers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(guess));
  return {
    ...game,
    questionCount: count,
    status: correct ? 'lost' : count >= game.maxQuestions ? 'won' : 'playing',
    history: [
      ...game.history,
      { role: 'player', kind: 'answer', text: reply },
      { role: 'assistant', kind: 'guess', text: guess },
      ...(!correct && count < game.maxQuestions ? [{ role: 'assistant' as const, kind: 'question' as const, text: nextQuestion }] : []),
    ],
  };
}