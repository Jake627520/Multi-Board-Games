import { describe, expect, it } from "vitest";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import type { GameViewContext } from "../../src/core/game/types";

describe("Player View Boundary & Structural Independence Integration", () => {
  const context: GameViewContext = { role: "spectator", player: null };

  it("ensures Xiangqi ViewState board is structurally independent from engine state", () => {
    const engine = createXiangqiEngine();
    const state = engine.createInitialState();
    const view = engine.projectView(state, context);

    const originalPiece = state.board[0][0];
    expect(originalPiece).not.toBeNull();

    // Mutate view board
    view.board[0][0] = null;

    // Engine state MUST NOT be mutated
    expect(state.board[0][0]).toEqual(originalPiece);
  });

  it("ensures Gomoku ViewState board is structurally independent from engine state", () => {
    const engine = createGomokuEngine();
    const state = engine.createInitialState();
    const view = engine.projectView(state, context);

    expect(state.board[7][7]).toBeNull();

    // Mutate view board
    view.board[7][7] = "black";

    // Engine state MUST NOT be mutated
    expect(state.board[7][7]).toBeNull();
  });

  it("ensures Banqi ViewState board is structurally independent from engine state", () => {
    const engine = createBanqiEngine();
    const state = engine.createInitialState();
    const view = engine.projectView(state, context);

    const originalPiece = state.board[0][0];
    expect(originalPiece).not.toBeNull();

    // Mutate view board
    view.board[0][0] = null;

    // Engine state MUST NOT be mutated
    expect(state.board[0][0]).toEqual(originalPiece);
  });
});
