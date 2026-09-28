import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGame } from "../src/game.js";

describe("game rules", () => {
  it("resolves every rock-paper-scissors outcome", () => {
    assert.deepEqual(resolveGame("rock-paper-scissors", "rock", "scissors"), { serverChoice: "scissors", won: true, draw: false });
    assert.deepEqual(resolveGame("rock-paper-scissors", "rock", "paper"), { serverChoice: "paper", won: false, draw: false });
    assert.deepEqual(resolveGame("rock-paper-scissors", "rock", "rock"), { serverChoice: "rock", won: false, draw: true });
  });

  it("resolves odd-even guesses", () => {
    assert.deepEqual(resolveGame("odd-even", "odd", "odd"), { serverChoice: "odd", won: true, draw: false });
    assert.deepEqual(resolveGame("odd-even", "odd", "even"), { serverChoice: "even", won: false, draw: false });
  });

  it("rejects choices outside the configured game", () => {
    assert.throws(() => resolveGame("odd-even", "rock", "odd"), /INVALID_CHOICE/);
  });
});