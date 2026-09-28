export type GameType = "rock-paper-scissors" | "odd-even";

export interface Player {
  id: string;
  nickname: string;
  streak: number;
  bestStreak: number;
  points: number;
  gamesPlayed: number;
  lastDailyChargeDate: string | null;
}

export interface GameConfig {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  entryFee: number;
  winReward: number;
  enabled: boolean;
  choices: { id: string; label: string; icon: string }[];
}

export interface Ranking { rank: number; id: string; nickname: string; streak: number; points: number }
export interface ServiceSettings { dailyChargeAmount: number; dailyChargeHour: number }
export interface Bootstrap { player: Player; games: GameConfig[]; settings: ServiceSettings; rankings: Ranking[] }
export interface PlayResult { id: number; gameId: GameType; playerChoice: string; serverChoice: string; won: boolean; draw: boolean; entryFee: number; reward: number; player: Player; playedAt: string }

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string" ? body.message : "요청을 처리하지 못했어요.";
    throw new Error(message);
  }
  return body as T;
}

export const luckKingApi = {
  bootstrap: () => api<Bootstrap>("/api/bootstrap"),
  play: (gameId: GameType, choice: string) => api<PlayResult>(`/api/games/${gameId}/play`, { method: "POST", body: JSON.stringify({ choice }) }),
  rankings: () => api<{ rankings: Ranking[] }>("/api/rankings"),
};