import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { Store } from "../src/store.js";
import type { GameConfig, Player, ServiceSettings } from "../src/types.js";

const player: Player = { id: "user", nickname: "테스터", streak: 0, bestStreak: 0, points: 1000, gamesPlayed: 0, lastDailyChargeDate: "2026-09-23" };
const games: GameConfig[] = [
  { id: "rock-paper-scissors", name: "가위바위보", description: "대결", icon: "✊", entryFee: 100, winReward: 220, enabled: true, choices: [{ id: "rock", label: "바위", icon: "✊" }] },
  { id: "odd-even", name: "홀짝", description: "예측", icon: "🎱", entryFee: 80, winReward: 170, enabled: true, choices: [{ id: "odd", label: "홀", icon: "1" }] },
];

class TestStore implements Store {
  settings: ServiceSettings = { dailyChargeAmount: 1000, dailyChargeHour: 0 };
  getSettings = async () => this.settings;
  updateSettings = async (value: ServiceSettings) => (this.settings = value);
  getPlayer = async () => player;
  getPlayers = async () => [player];
  adjustPoints = async (_id: string, amount: number) => ({ ...player, points: player.points + amount });
  getGames = async () => games;
  getGame = async (id: string) => games.find((game) => game.id === id);
  updateGame = async (id: GameConfig["id"], values: Pick<GameConfig, "entryFee" | "winReward" | "enabled">) => ({ ...games.find((game) => game.id === id)!, ...values });
  savePlay = async (input: Parameters<Store["savePlay"]>[0]) => ({ ...input, id: 1, playedAt: new Date().toISOString(), player: { ...player, gamesPlayed: 1 } });
  getRankings = async () => [{ rank: 1, id: player.id, nickname: player.nickname, streak: 0, points: 1000 }];
  getPlayRecords = async () => [];
  getDashboard = async () => ({ users: 1, totalPlays: 0, todayPlays: 0, pointsInCirculation: 1000 });
}

describe("LuckKing API", () => {
  it("bootstraps all server-owned app data", async () => {
    const response = await request(createApp(new TestStore())).get("/api/bootstrap");
    assert.equal(response.status, 200);
    assert.equal(response.body.games.length, 2);
    assert.equal(response.body.settings.dailyChargeAmount, 1000);
  });

  it("plays a configured game", async () => {
    const response = await request(createApp(new TestStore())).post("/api/games/rock-paper-scissors/play").send({ choice: "rock" });
    assert.equal(response.status, 200);
    assert.equal(response.body.entryFee, 100);
    assert.equal(response.body.player.gamesPlayed, 1);
  });

  it("protects and updates admin settings", async () => {
    const app = createApp(new TestStore());
    assert.equal((await request(app).get("/api/admin/dashboard")).status, 401);
    const response = await request(app).patch("/api/admin/settings").set("x-admin-key", "dev-admin-key").send({ dailyChargeAmount: 1500, dailyChargeHour: 6 });
    assert.equal(response.status, 200);
    assert.equal(response.body.settings.dailyChargeAmount, 1500);
  });
});