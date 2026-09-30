import 'server-only';
import type { PublicGame } from '@yes-or-no/shared';
import type { Answer } from '@yes-or-no/question-bank';
import { canAccessGame } from './game-access';

type Session = { game: PublicGame; answer: Answer; defenseAnswer?: Answer; ownerKey: string | null };

const store = globalThis as typeof globalThis & { __yesOrNoSessions?: Map<string, Session> };
const sessions = store.__yesOrNoSessions ?? (store.__yesOrNoSessions = new Map());

export function createSession(game: PublicGame, answer: Answer, ownerKey: string | null, defenseAnswer?: Answer): void {
  sessions.set(game.id, { game, answer, ownerKey, defenseAnswer });
}

export function getSession(id: string, userKey: string | null): Session | undefined {
  const session = sessions.get(id);
  return session && canAccessGame(session.ownerKey, userKey) ? session : undefined;
}

export function saveGame(id: string, game: PublicGame): void {
  const session = sessions.get(id);
  if (session) session.game = game;
}

export function publicStatistics() {
  const games = Array.from(sessions.values(), ({ game }) => game);
  return {
    total: games.length,
    playing: games.filter((game) => game.status === 'playing').length,
    won: games.filter((game) => game.status === 'won').length,
    lost: games.filter((game) => game.status === 'lost').length,
    animals: games.filter((game) => game.category === 'animals').length,
    food: games.filter((game) => game.category === 'food').length,
  };
}