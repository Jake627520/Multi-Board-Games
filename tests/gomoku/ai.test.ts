import { describe, it, expect } from "vitest";
import { createGomokuAiLevel1 } from "../../src/games/gomoku/ai";
import { createGomokuEngine } from "../../src/games/gomoku/engine";
import { createEmptyBoard } from "../../src/games/gomoku/board";
import type { GomokuState } from "../../src/games/gomoku/types";

describe("Gomoku Level 1 AI", () => {
  const ai = createGomokuAiLevel1();
  const engine = createGomokuEngine();

  it("should have correct id and name metadata", () => {
    expect(ai.id).toBe("gomoku-ai-l1");
    expect(ai.name).toContain("Level 1");
  });

  it("should play in center (7, 7) on an empty board opening", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = engine.getLegalMoves(initialState);

    const move = await ai.selectMove(initialState, legalMoves);
    expect(move).toEqual({ row: 7, col: 7 });
  });

  it("should immediately take the winning 5th stone", async () => {
    // Setup: Black has (7, 3), (7, 4), (7, 5), (7, 6). Winning move is (7, 7) or (7, 2).
    const board = createEmptyBoard();
    board[7][3] = "black";
    board[7][4] = "black";
    board[7][5] = "black";
    board[7][6] = "black";

    const state: GomokuState = {
      board,
      currentPlayer: "black",
      winner: null,
      moveNumber: 8,
      ruleMode: "freestyle",
    };

    const legalMoves = engine.getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // Both (7, 2) and (7, 7) win immediately
    expect(
      (move.row === 7 && move.col === 7) || (move.row === 7 && move.col === 2)
    ).toBe(true);
  });

  it("should block opponent's immediate winning threat", async () => {
    // Setup: Human Black has (7, 3), (7, 4), (7, 5), (7, 6).
    // It's White AI's turn; White MUST play (7, 2) or (7, 7) to prevent Black winning next turn.
    const board = createEmptyBoard();
    board[7][3] = "black";
    board[7][4] = "black";
    board[7][5] = "black";
    board[7][6] = "black";

    const state: GomokuState = {
      board,
      currentPlayer: "white",
      winner: null,
      moveNumber: 8,
      ruleMode: "freestyle",
    };

    const legalMoves = engine.getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    expect(
      (move.row === 7 && move.col === 7) || (move.row === 7 && move.col === 2)
    ).toBe(true);
  });

  it("should throw error if legalMoves is empty", async () => {
    const state = engine.createInitialState();
    await expect(ai.selectMove(state, [])).rejects.toThrow(
      "No legal moves available"
    );
  });
});
