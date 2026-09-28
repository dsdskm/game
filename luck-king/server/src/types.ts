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

export interface ServiceSettings {
  dailyChargeAmount: number;
  dailyChargeHour: number;
}

export interface PlayResult {
  id: number;
  gameId: GameType;
  playerChoice: string;
  serverChoice: string;
  won: boolean;
  draw: boolean;
  entryFee: number;
  reward: number;
  player: Player;
  playedAt: string;
}

export interface PlayRecord extends Omit<PlayResult, "player"> {
  userId: string;
  nickname: string;
}

export interface Dashboard {
  users: number;
  totalPlays: number;
  todayPlays: number;
  pointsInCirculation: number;
}