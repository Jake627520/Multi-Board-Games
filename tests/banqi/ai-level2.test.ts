import { describe, it, expect } from "vitest";
import { createBanqiAiLevel2 } from "../../src/games/banqi/ai";
import { createBanqiEngine } from "../../src/games/banqi/engine";
import { emptyBoard } from "../../src/games/banqi/board";
import { getLegalMoves } from "../../src/games/banqi/rules";
import type { BanqiPiece, BanqiState } from "../../src/games/banqi/types";

describe("Banqi AI Level 2 (Minimax)", () => {
  const ai = createBanqiAiLevel2();
  const engine = createBanqiEngine();

  it("should have correct id and name metadata", () => {
    expect(ai.id).toBe("banqi-ai-l2");
    expect(ai.name).toContain("Level 2");
  });

  it("should select a strictly legal move from initial opening", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = getLegalMoves(initialState);

    const move = await ai.selectMove(initialState, legalMoves);
    expect(move.type).toBe("flip");
    if (move.type === "flip") {
      const isLegal = legalMoves.some(
        (m) =>
          m.type === "flip" &&
          m.pos.row === move.pos.row &&
          m.pos.col === move.pos.col
      );
      expect(isLegal).toBe(true);
    }
  });

  it("should select an immediate capture of an exposed enemy piece", async () => {
    const board = emptyBoard();
    const redGeneral: BanqiPiece = {
      id: "r-g",
      player: "red",
      type: "general",
      rank: 7,
      isRevealed: true,
    };
    const blackChariot: BanqiPiece = {
      id: "b-r",
      player: "black",
      type: "chariot",
      rank: 4,
      isRevealed: true,
    };

    board[0][0] = redGeneral;
    board[0][1] = blackChariot;

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 4,
    };

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    expect(move.type).toBe("move");
    if (move.type === "move") {
      expect(move.from).toEqual({ row: 0, col: 0 });
      expect(move.to).toEqual({ row: 0, col: 1 });
    }
  });

  it("should avoid walking into capture by opponent piece in 2-ply horizon", async () => {
    // Red General at (0, 0).
    // Black Soldier at (0, 2).
    // If Red moves to (0, 1), Black Soldier (rank 1) can eat Red General (rank 7) on the next ply!
    // Safe move for Red General is (1, 0).
    const board = emptyBoard();
    const redGeneral: BanqiPiece = {
      id: "r-g",
      player: "red",
      type: "general",
      rank: 7,
      isRevealed: true,
    };
    const blackSoldier: BanqiPiece = {
      id: "b-s",
      player: "black",
      type: "soldier",
      rank: 1,
      isRevealed: true,
    };

    board[0][0] = redGeneral;
    board[0][2] = blackSoldier;

    const state: BanqiState = {
      board,
      currentPlayer: "red",
      player1Color: "red",
      winner: null,
      moveNumber: 6,
    };

    const legalMoves = getLegalMoves(state);
    const move = await ai.selectMove(state, legalMoves);

    expect(move.type).toBe("move");
    if (move.type === "move") {
      // Must not move to (0, 1) where Black Soldier would capture it!
      expect(move.to).not.toEqual({ row: 0, col: 1 });
      expect(move.to).toEqual({ row: 1, col: 0 });
    }
  });

  it("should complete depth-2 search within performance budget (< 500ms)", async () => {
    const initialState = engine.createInitialState();
    const legalMoves = getLegalMoves(initialState);

    const start = performance.now();
    const move = await ai.selectMove(initialState, legalMoves);
    const duration = performance.now() - start;

    expect(move).toBeDefined();
    expect(duration).toBeLessThan(500);
  });
});
