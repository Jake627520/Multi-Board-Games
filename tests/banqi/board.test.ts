import { describe, it, expect } from "vitest";
import {
  createInitialBoard,
  generateAllPieces,
  ROWS,
  COLS,
} from "../../src/games/banqi/board";

describe("Banqi Board & Pieces Setup", () => {
  it("generates exactly 32 pieces with correct sides and ranks", () => {
    const pieces = generateAllPieces();
    expect(pieces).toHaveLength(32);

    const redPieces = pieces.filter((p) => p.player === "red");
    const blackPieces = pieces.filter((p) => p.player === "black");
    expect(redPieces).toHaveLength(16);
    expect(blackPieces).toHaveLength(16);

    // Verify all pieces start face down
    expect(pieces.every((p) => !p.isRevealed)).toBe(true);

    // Verify rank distribution (e.g. 5 soldiers, 1 general)
    expect(redPieces.filter((p) => p.type === "soldier")).toHaveLength(5);
    expect(redPieces.filter((p) => p.type === "general")).toHaveLength(1);
    expect(blackPieces.filter((p) => p.type === "soldier")).toHaveLength(5);
    expect(blackPieces.filter((p) => p.type === "general")).toHaveLength(1);
  });

  it("creates a 4x8 board filled with 32 face-down pieces", () => {
    const board = createInitialBoard();
    expect(board).toHaveLength(ROWS);
    expect(board[0]).toHaveLength(COLS);

    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const piece = board[r][c];
        expect(piece).not.toBeNull();
        expect(piece?.isRevealed).toBe(false);
        count++;
      }
    }
    expect(count).toBe(32);
  });
});
