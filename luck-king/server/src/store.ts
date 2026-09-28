import { Pool, type PoolClient, type QueryResult } from "pg";
import type { Dashboard, GameConfig, GameType, PlayRecord, PlayResult, Player, ServiceSettings } from "./types.js";

export interface Store {
  getSettings(): Promise<ServiceSettings>;
  updateSettings(settings: ServiceSettings): Promise<ServiceSettings>;
  getPlayer(id: string, now?: Date): Promise<Player | undefined>;
  getPlayers(): Promise<Player[]>;
  adjustPoints(id: string, amount: number): Promise<Player | undefined>;
  getGames(): Promise<GameConfig[]>;
  getGame(id: string): Promise<GameConfig | undefined>;
  updateGame(id: GameType, values: Pick<GameConfig, "entryFee" | "winReward" | "enabled">): Promise<GameConfig | undefined>;
  savePlay(input: Omit<PlayResult, "id" | "player" | "playedAt"> & { userId: string }): Promise<PlayResult>;
  getRankings(): Promise<{ rank: number; id: string; nickname: string; streak: number; points: number }[]>;
  getPlayRecords(limit?: number): Promise<PlayRecord[]>;
  getDashboard(): Promise<Dashboard>;
}

interface PlayerRow { id: string; nickname: string; streak: number; best_streak: number; points: number; games_played: number; last_daily_charge_date: string | null }
interface GameRow { id: GameType; name: string; description: string; icon: string; entry_fee: number; win_reward: number; enabled: boolean; choices: GameConfig["choices"] }
type Queryable = { query: <T extends object>(text: string, values?: unknown[]) => Promise<QueryResult<T>> };

export class PostgresStore implements Store {
  constructor(private readonly pool: Pool) {}

  async close() { await this.pool.end(); }

  async getSettings() {
    const { rows } = await this.pool.query<{ key: string; value: string }>("SELECT key, value FROM settings");
    const values = Object.fromEntries(rows.map((row) => [row.key, Number(row.value)]));
    return { dailyChargeAmount: values.dailyChargeAmount ?? 1000, dailyChargeHour: values.dailyChargeHour ?? 0 };
  }

  async updateSettings(settings: ServiceSettings) {
    await this.pool.query("INSERT INTO settings(key, value) VALUES ($1, $2), ($3, $4) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["dailyChargeAmount", String(settings.dailyChargeAmount), "dailyChargeHour", String(settings.dailyChargeHour)]);
    return this.getSettings();
  }

  async getPlayer(id: string, now = new Date()) {
    await this.applyDailyCharge(this.pool, id, now);
    const { rows } = await this.pool.query<PlayerRow>("SELECT * FROM players WHERE id = $1", [id]);
    return rows[0] ? this.mapPlayer(rows[0]) : undefined;
  }

  async getPlayers() {
    const { rows } = await this.pool.query<PlayerRow>("SELECT * FROM players ORDER BY points DESC, id");
    return rows.map((row) => this.mapPlayer(row));
  }

  async adjustPoints(id: string, amount: number) {
    const { rows } = await this.pool.query<PlayerRow>("UPDATE players SET points = GREATEST(0, points + $1) WHERE id = $2 RETURNING *", [amount, id]);
    return rows[0] ? this.mapPlayer(rows[0]) : undefined;
  }

  async getGames() {
    const { rows } = await this.pool.query<GameRow>("SELECT * FROM games ORDER BY sort_order");
    return rows.map((row) => this.mapGame(row));
  }

  async getGame(id: string) {
    const { rows } = await this.pool.query<GameRow>("SELECT * FROM games WHERE id = $1", [id]);
    return rows[0] ? this.mapGame(rows[0]) : undefined;
  }

  async updateGame(id: GameType, values: Pick<GameConfig, "entryFee" | "winReward" | "enabled">) {
    const { rows } = await this.pool.query<GameRow>("UPDATE games SET entry_fee = $1, win_reward = $2, enabled = $3 WHERE id = $4 RETURNING *", [values.entryFee, values.winReward, values.enabled, id]);
    return rows[0] ? this.mapGame(rows[0]) : undefined;
  }

  async savePlay(input: Omit<PlayResult, "id" | "player" | "playedAt"> & { userId: string }) {
    return this.withTransaction(async (client) => {
      await this.applyDailyCharge(client, input.userId, new Date());
      const playerRow = (await client.query<PlayerRow>("SELECT * FROM players WHERE id = $1 FOR UPDATE", [input.userId])).rows[0];
      const gameRow = (await client.query<GameRow>("SELECT * FROM games WHERE id = $1 FOR SHARE", [input.gameId])).rows[0];
      if (!playerRow) throw new Error("PLAYER_NOT_FOUND");
      if (!gameRow || !gameRow.enabled) throw new Error("GAME_DISABLED");
      if (playerRow.points < gameRow.entry_fee) throw new Error("INSUFFICIENT_POINTS");
      const reward = input.draw ? gameRow.entry_fee : input.won ? gameRow.win_reward : 0;
      const nextStreak = input.won ? playerRow.streak + 1 : input.draw ? playerRow.streak : 0;
      const updated = await client.query<PlayerRow>("UPDATE players SET points = points - $1 + $2, streak = $3, best_streak = GREATEST(best_streak, $3), games_played = games_played + 1 WHERE id = $4 RETURNING *", [gameRow.entry_fee, reward, nextStreak, input.userId]);
      const inserted = await client.query<{ id: string; played_at: Date }>("INSERT INTO plays(user_id, game_id, player_choice, server_choice, won, draw, entry_fee, reward) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text, played_at", [input.userId, input.gameId, input.playerChoice, input.serverChoice, input.won, input.draw, gameRow.entry_fee, reward]);
      return { ...input, id: Number(inserted.rows[0]!.id), entryFee: gameRow.entry_fee, reward, playedAt: inserted.rows[0]!.played_at.toISOString(), player: this.mapPlayer(updated.rows[0]!) };
    });
  }

  async getRankings() {
    const { rows } = await this.pool.query<{ rank: string; id: string; nickname: string; streak: number; points: number }>("SELECT row_number() OVER (ORDER BY streak DESC, points DESC, id)::text rank, id, nickname, streak, points FROM players ORDER BY streak DESC, points DESC, id");
    return rows.map((row) => ({ ...row, rank: Number(row.rank) }));
  }

  async getPlayRecords(limit = 100) {
    const { rows } = await this.pool.query<{ id: string; userId: string; nickname: string; gameId: GameType; playerChoice: string; serverChoice: string; won: boolean; draw: boolean; entryFee: number; reward: number; playedAt: Date }>("SELECT p.id::text, p.user_id \"userId\", u.nickname, p.game_id \"gameId\", p.player_choice \"playerChoice\", p.server_choice \"serverChoice\", p.won, p.draw, p.entry_fee \"entryFee\", p.reward, p.played_at \"playedAt\" FROM plays p JOIN players u ON u.id = p.user_id ORDER BY p.id DESC LIMIT $1", [limit]);
    return rows.map((row) => ({ ...row, id: Number(row.id), playedAt: row.playedAt.toISOString() }));
  }

  async getDashboard() {
    const { rows } = await this.pool.query<{ users: string; totalPlays: string; todayPlays: string; pointsInCirculation: string }>("SELECT (SELECT count(*) FROM players)::text users, (SELECT count(*) FROM plays)::text \"totalPlays\", (SELECT count(*) FROM plays WHERE played_at::date = current_date)::text \"todayPlays\", (SELECT coalesce(sum(points), 0) FROM players)::text \"pointsInCirculation\"");
    const row = rows[0]!;
    return { users: Number(row.users), totalPlays: Number(row.totalPlays), todayPlays: Number(row.todayPlays), pointsInCirculation: Number(row.pointsInCirculation) };
  }

  private async applyDailyCharge(queryable: Queryable, id: string, now: Date) {
    const { rows } = await queryable.query<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key IN ('dailyChargeAmount', 'dailyChargeHour')");
    const values = Object.fromEntries(rows.map((row) => [row.key, Number(row.value)]));
    const settings = { dailyChargeAmount: values.dailyChargeAmount ?? 1000, dailyChargeHour: values.dailyChargeHour ?? 0 };
    const chargeDate = new Date(now.getTime() - settings.dailyChargeHour * 3_600_000).toISOString().slice(0, 10);
    await queryable.query("UPDATE players SET points = points + $1, last_daily_charge_date = $2::date WHERE id = $3 AND last_daily_charge_date IS DISTINCT FROM $2::date", [settings.dailyChargeAmount, chargeDate, id]);
  }

  private mapPlayer(row: PlayerRow): Player {
    return { id: row.id, nickname: row.nickname, streak: row.streak, bestStreak: row.best_streak, points: row.points, gamesPlayed: row.games_played, lastDailyChargeDate: row.last_daily_charge_date };
  }

  private mapGame(row: GameRow): GameConfig {
    return { id: row.id, name: row.name, description: row.description, icon: row.icon, entryFee: row.entry_fee, winReward: row.win_reward, enabled: row.enabled, choices: row.choices };
  }

  private async withTransaction<T>(operation: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}