import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/games/gomoku/board";
import { applyMove, getLegalMoves, getWinner, isGameOver } from "../../src/games/gomoku/rules";
import type { GomokuState } from "../../src/games/gomoku/types";

describe("Gomoku Rules & Mechanics", () => {
  it("initializes with Black starting and 225 legal moves", () => {
    const s = createInitialState();
    expect(s.currentPlayer).toBe("black");
    expect(s.winner).toBeNull();
    expect(s.isDraw).toBeFalsy();
    expect(isGameOver(s)).toBe(false);
    expect(getLegalMoves(s)).toHaveLength(225);
  });

  it("applies legal stone placement and alternates player", () => {
    let s = createInitialState();
    s = applyMove(s, { row: 7, col: 7 });

    expect(s.board[7][7]).toBe("black");
    expect(s.currentPlayer).toBe("white");
    expect(s.moveNumber).toBe(2);
    expect(getLegalMoves(s)).toHaveLength(224);
    expect(getLegalMoves(s).some((m) => m.row === 7 && m.col === 7)).toBe(false);

    s = applyMove(s, { row: 7, col: 8 });
    expect(s.board[7][8]).toBe("white");
    expect(s.currentPlayer).toBe("black");
    expect(s.moveNumber).toBe(3);
  });

  it("rejects placement on already occupied intersection", () => {
    let s = createInitialState();
    s = applyMove(s, { row: 7, col: 7 });

    expect(() => applyMove(s, { row: 7, col: 7 })).toThrow("Illegal move");
  });

  it("rejects out-of-bounds moves", () => {
    const s = createInitialState();
    expect(() => applyMove(s, { row: -1, col: 0 })).toThrow("Illegal move");
    expect(() => applyMove(s, { row: 15, col: 7 })).toThrow("Illegal move");
  });

  describe("Five-in-a-Row Win Conditions", () => {
    it("detects horizontal 5-in-a-row victory", () => {
      let s = createInitialState();
      // Black: (7, 3), (7, 4), (7, 5), (7, 6), (7, 7)
      // White plays irrelevant moves on row 0
      const moves = [
        { row: 7, col: 3 }, // B
        { row: 0, col: 0 }, // W
        { row: 7, col: 4 }, // B
        { row: 0, col: 1 }, // W
        { row: 7, col: 5 }, // B
        { row: 0, col: 2 }, // W
        { row: 7, col: 6 }, // B
        { row: 0, col: 3 }, // W
        { row: 7, col: 7 }, // B wins!
      ];

      for (const m of moves) s = applyMove(s, m);

      expect(isGameOver(s)).toBe(true);
      expect(getWinner(s)).toBe("black");
      expect(getLegalMoves(s)).toHaveLength(0);
    });

    it("detects vertical 5-in-a-row victory", () => {
      let s = createInitialState();
      // White: (2, 5), (3, 5), (4, 5), (5, 5), (6, 5)
      const moves = [
        { row: 0, col: 0 }, // B
        { row: 2, col: 5 }, // W
        { row: 0, col: 1 }, // B
        { row: 3, col: 5 }, // W
        { row: 0, col: 2 }, // B
        { row: 4, col: 5 }, // W
        { row: 0, col: 3 }, // B
        { row: 5, col: 5 }, // W
        { row: 1, col: 0 }, // B
        { row: 6, col: 5 }, // W wins!
      ];

      for (const m of moves) s = applyMove(s, m);

      expect(isGameOver(s)).toBe(true);
      expect(getWinner(s)).toBe("white");
    });

    it("detects major diagonal (\\) 5-in-a-row victory", () => {
      let s = createInitialState();
      // Black: (1, 1), (2, 2), (3, 3), (4, 4), (5, 5)
      const moves = [
        { row: 1, col: 1 }, // B
        { row: 0, col: 1 }, // W
        { row: 2, col: 2 }, // B
        { row: 0, col: 2 }, // W
        { row: 3, col: 3 }, // B
        { row: 0, col: 3 }, // W
        { row: 4, col: 4 }, // B
        { row: 0, col: 4 }, // W
        { row: 5, col: 5 }, // B wins!
      ];

      for (const m of moves) s = applyMove(s, m);

      expect(isGameOver(s)).toBe(true);
      expect(getWinner(s)).toBe("black");
    });

    it("detects minor diagonal (/) 5-in-a-row victory", () => {
      let s = createInitialState();
      // Black: (4, 0), (3, 1), (2, 2), (1, 3), (0, 4)
      const moves = [
        { row: 4, col: 0 }, // B
        { row: 10, col: 0 }, // W
        { row: 3, col: 1 }, // B
        { row: 10, col: 1 }, // W
        { row: 2, col: 2 }, // B
        { row: 10, col: 2 }, // W
        { row: 1, col: 3 }, // B
        { row: 10, col: 3 }, // W
        { row: 0, col: 4 }, // B wins!
      ];

      for (const m of moves) s = applyMove(s, m);

      expect(isGameOver(s)).toBe(true);
      expect(getWinner(s)).toBe("black");
    });
  });

  it("declares draw when board is completely filled without a 5-in-a-row", () => {
    // 2-tile alternating checkerboard: maximum 2 consecutive stones in all 4 directions
    const board: (import("../../src/games/gomoku/types").GomokuPlayer | null)[][] = Array.from(
      { length: 15 },
      (_, r) =>
        Array.from({ length: 15 }, (_, c) =>
        r % 2 === 0
          ? c % 4 < 2
            ? "black"
            : "white"
          : c % 4 < 2
          ? "white"
          : "black"
      )
    );
    // Leave exactly 1 empty spot at (14, 14)
    board[14][14] = null;

    const nearFullState: GomokuState = {
      board,
      currentPlayer: "black",
      winner: null,
      moveNumber: 225,
      ruleMode: "freestyle",
    };

    expect(isGameOver(nearFullState)).toBe(false);
    expect(getLegalMoves(nearFullState)).toHaveLength(1);

    const fullState = applyMove(nearFullState, { row: 14, col: 14 });

    expect(isGameOver(fullState)).toBe(true);
    expect(fullState.isDraw).toBe(true);
    expect(getWinner(fullState)).toBeNull();
    expect(getLegalMoves(fullState)).toHaveLength(0);
  });
});
