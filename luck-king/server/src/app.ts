import cors from "cors";
import express from "express";
import { z } from "zod";
import { resolveGame } from "./game.js";
import type { Store } from "./store.js";
import type { GameType } from "./types.js";

const playRequest = z.object({ choice: z.string().min(1).max(30) });
const gameUpdateRequest = z.object({ entryFee: z.number().int().min(0).max(1_000_000), winReward: z.number().int().min(0).max(1_000_000), enabled: z.boolean() });
const settingsRequest = z.object({ dailyChargeAmount: z.number().int().min(0).max(1_000_000), dailyChargeHour: z.number().int().min(0).max(23) });
const pointRequest = z.object({ amount: z.number().int().min(-1_000_000).max(1_000_000) });

export function createApp(store: Store) {
  const app = express();
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:4173").split(",").map((origin) => origin.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: "16kb" }));

  const userId = (request: express.Request) => request.header("x-user-id") ?? process.env.DEFAULT_USER_ID ?? "demo-user";
  const requireAdmin: express.RequestHandler = (request, response, next) => {
    if (request.header("x-admin-key") !== (process.env.ADMIN_API_KEY ?? "dev-admin-key")) {
      response.status(401).json({ message: "관리자 인증이 필요해요." });
      return;
    }
    next();
  };

  app.get("/api/health", async (_request, response) => response.json({ status: "ok" }));
  app.get("/api/bootstrap", async (request, response) => {
    const player = await store.getPlayer(userId(request));
    if (!player) {
      response.status(404).json({ message: "사용자를 찾을 수 없어요." });
      return;
    }
    const [games, settings, rankings] = await Promise.all([store.getGames(), store.getSettings(), store.getRankings()]);
    response.json({ player, games: games.filter((game) => game.enabled), settings, rankings });
  });

  app.post("/api/games/:gameId/play", async (request, response) => {
    const parsed = playRequest.safeParse(request.body);
    const game = await store.getGame(request.params.gameId);
    if (!parsed.success || !game) {
      response.status(400).json({ message: "게임 요청이 올바르지 않아요." });
      return;
    }
    try {
      const outcome = resolveGame(game.id, parsed.data.choice);
      response.json(await store.savePlay({ userId: userId(request), gameId: game.id, playerChoice: parsed.data.choice, serverChoice: outcome.serverChoice, won: outcome.won, draw: outcome.draw, entryFee: game.entryFee, reward: 0 }));
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_POINTS") {
        response.status(409).json({ message: "게임 참가에 필요한 포인트가 부족해요." });
        return;
      }
      if (error instanceof Error && ["INVALID_CHOICE", "GAME_DISABLED"].includes(error.message)) {
        response.status(400).json({ message: "선택할 수 없는 게임 또는 항목이에요." });
        return;
      }
      throw error;
    }
  });

  app.get("/api/rankings", async (_request, response) => response.json({ rankings: await store.getRankings() }));
  app.use("/api/admin", requireAdmin);
  app.get("/api/admin/dashboard", async (_request, response) => response.json({ dashboard: await store.getDashboard(), settings: await store.getSettings() }));
  app.get("/api/admin/games", async (_request, response) => response.json({ games: await store.getGames() }));
  app.patch("/api/admin/games/:gameId", async (request, response) => {
    const parsed = gameUpdateRequest.safeParse(request.body);
    const gameId = request.params.gameId as GameType;
    if (!parsed.success || !await store.getGame(gameId)) {
      response.status(400).json({ message: "게임 설정이 올바르지 않아요." });
      return;
    }
    response.json({ game: await store.updateGame(gameId, parsed.data) });
  });
  app.patch("/api/admin/settings", async (request, response) => {
    const parsed = settingsRequest.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ message: "서비스 설정이 올바르지 않아요." });
      return;
    }
    response.json({ settings: await store.updateSettings(parsed.data) });
  });
  app.get("/api/admin/players", async (_request, response) => response.json({ players: await store.getPlayers() }));
  app.patch("/api/admin/players/:userId/points", async (request, response) => {
    const parsed = pointRequest.safeParse(request.body);
    if (!parsed.success || !await store.getPlayer(request.params.userId)) {
      response.status(400).json({ message: "포인트 조정 요청이 올바르지 않아요." });
      return;
    }
    response.json({ player: await store.adjustPoints(request.params.userId, parsed.data.amount) });
  });
  app.get("/api/admin/plays", async (_request, response) => response.json({ plays: await store.getPlayRecords() }));

  app.use((_request, response) => response.status(404).json({ message: "API를 찾을 수 없어요." }));
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    void next;
    console.error(error);
    response.status(500).json({ message: "서버 오류가 발생했어요." });
  });
  return app;
}