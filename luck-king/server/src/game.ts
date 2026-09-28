import { randomInt } from "node:crypto";
import type { GameType } from "./types.js";

const choicesByGame: Record<GameType, string[]> = {
  "rock-paper-scissors": ["rock", "paper", "scissors"],
  "odd-even": ["odd", "even"],
};

export function resolveGame(gameId: GameType, playerChoice: string, forcedChoice?: string) {
  const choices = choicesByGame[gameId];
  if (!choices.includes(playerChoice)) throw new Error("INVALID_CHOICE");
  const serverChoice = forcedChoice ?? choices[randomInt(choices.length)]!;

  if (gameId === "odd-even") {
    return { serverChoice, won: playerChoice === serverChoice, draw: false };
  }

  const draw = playerChoice === serverChoice;
  const won = (playerChoice === "rock" && serverChoice === "scissors")
    || (playerChoice === "paper" && serverChoice === "rock")
    || (playerChoice === "scissors" && serverChoice === "paper");
  return { serverChoice, won, draw };
}