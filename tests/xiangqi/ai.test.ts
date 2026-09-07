import { describe, it, expect } from "vitest";
import { createXiangqiAiLevel1 } from "../../src/games/xiangqi/ai";
import { createXiangqiEngine } from "../../src/games/xiangqi/engine";
import { emptyBoard } from "../../src/games/xiangqi/board";
import type { Piece, XiangqiState } from "../../src/games/xiangqi/types";

describe("Xiangqi Level 1 AI", () => {
  const ai = createXiangqiAiLevel1();
  const engine = createXiangqiEngine();

  it("should have correct id and name metadata", () => {
    expect(ai.id).toBe("xiangqi-ai-l1");
    expect(ai.name).toContain("Level 1");
  });

  it("should select a strictly legal move from initial opening", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = engine.getLegalMoves(initialState);

    const move = await ai.selectMove(initialState, legalMoves);
    const isLegal = legalMoves.some(
      (m) =>
        m.from.row === move.from.row &&
        m.from.col === move.from.col &&
        m.to.row === move.to.row &&
        m.to.col === move.to.col
    );

    expect(isLegal).toBe(true);
  });

  it("should prioritize capturing high value unprotected piece (e.g. enemy chariot)", async () => {
    // Red turn. Red has Chariot at (5, 0).
    // Black has an unprotected Chariot at (0, 0) and a Soldier at (5, 3).
    // Black King is at (0, 4), Red King at (9, 4). (Not facing each other on column 4)
    // Red Chariot at (5, 0) has open column 0 all the way to (0, 0).
    const board = emptyBoard();
    const redKing: Piece = { id: "rk", player: "red", type: "general", position: { row: 9, col: 4 } };
    const blackKing: Piece = { id: "bk", player: "black", type: "general", position: { row: 0, col: 3 } }; // col 3 prevents flying general with Red General at col 4
    const redChariot: Piece = { id: "rc", player: "red", type: "chariot", position: { row: 5, col: 0 } };
    const blackChariot: Piece = { id: "bc", player: "black", type: "chariot", position: { row: 0, col: 0 } };
    const blackSoldier: Piece = { id: "bs", player: "black", type: "soldier", position: { row: 5, col: 3 } };

    board[9][4] = redKing;
    board[0][3] = blackKing;
    board[5][0] = redChariot;
    board[0][0] = blackChariot;
    board[5][3] = blackSoldier;

    const state: XiangqiState = {
      board,
      currentPlayer: "red",
      winner: null,
      moveNumber: 10,
    };

    const legalMoves = engine.getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    // Should capture the Black Chariot at (0, 0)
    expect(move.to).toEqual({ row: 0, col: 0 });
  });

  it("should resolve check when general is under attack", async () => {
    // Black Cannon at (9, 0) checks Red King at (9, 4) with Red Chariot at (9, 2) acting as screen.
    // Red King must move to a safe square, or Chariot move to break the screen/capture Cannon.
    const board = emptyBoard();
    const redKing: Piece = { id: "rk", player: "red", type: "general", position: { row: 9, col: 4 } };
    const blackKing: Piece = { id: "bk", player: "black", type: "general", position: { row: 0, col: 3 } };
    const blackCannon: Piece = { id: "bc", player: "black", type: "cannon", position: { row: 9, col: 0 } };
    const redChariot: Piece = { id: "rc", player: "red", type: "chariot", position: { row: 9, col: 2 } };

    board[9][4] = redKing;
    board[0][3] = blackKing;
    board[9][0] = blackCannon;
    board[9][2] = redChariot;

    const state: XiangqiState = {
      board,
      currentPlayer: "red",
      winner: null,
      moveNumber: 15,
    };

    const legalMoves = engine.getLegalMoves(state);
    expect(legalMoves.length).toBeGreaterThan(0);

    const move = await ai.selectMove(state, legalMoves);
    const nextState = engine.applyMove(state, move);

    // General must no longer be in check
    expect(engine.isGameOver(nextState)).toBe(false);
  });

  it("should throw error if legalMoves is empty", async () => {
    const state = engine.createInitialState();
    await expect(ai.selectMove(state, [])).rejects.toThrow(
      "No legal moves available"
    );
  });
});
